import { log } from '../log';
import { IAddress, IMessage, MessageStage, MessageType } from './types';
import evp from 'email-validator-pro';



const user_name_regex = /^(?!.*[._-]{2})[a-zA-Z0-9]+([._-]?[a-zA-Z0-9]+)*$/;



export default class Email {
    private _id = crypto.randomUUID();
    private _created_at = new Date();
        
    private _message_sequence: Array<IMessage> = [];
    private _markers: Map<string, string> = new Map();
    private _locked = false;
    private _mode: 'EHLO' | 'HELO' = 'EHLO';


    private _sending_data = false;
    private _data: Array<string> = [];
    private _data_size = 0;


    // -- Sender information
    private _from_domain: string;
    private _from_email_local: string;
    private _from_email_domain: string;
    private _from_user: string;

    private _ccs: Array<IAddress> = [];


    public constructor() {}



    /**
     * @name push_message
     * @description Pushes a message to the message sequence, this sequence
     * is usefull for debugging and logging
     * 
     * @param {MessageType} type - The type of message, recv or send
     * @param {string} content - The content of the message
     * 
     * @returns {void} Nothing
     */
    public push_message(
        type: MessageType,
        content: string,
    ): void {
        // -- Push the message to the message sequence
        this._message_sequence.push({
            content,
            type,
            date: new Date(),
        });
        console.log(`[${type}] ${content}`);
    }

    public close(
        success: boolean,
    ) {

    }

    public get id(): string { return this._id; }

    public set marker(marker: string) { this._markers.set(marker, marker); }
    public has_marker(marker: string): boolean { return this._markers.has(marker); }
    


    /**
     * @name ensure_sequence
     * @description Ensures that the message sequence is in the correct order
     * by looking at the last x messages
     * 
     * @param {string} marker - The marker to look for
     * @param {Array<string>} ignore - Markers to ignore
     * 
     * @example
     * 
     * 
     * sequence = [ 'EHLO', 'MAIL FROM', 'RCPT TO', 'RCPT TO' ];
     * const ignore = [ 'RCPT TO' ];
     * 
     * const result = ensure_sequence('MAIL FROM', ignore); // true
     * 
     * 
     * sequence = [ 'EHLO', 'MAIL FROM', 'RCPT TO',  'OTHER' ];
     * const ignore = [ 'RCPT TO' ];
     * 
     * const result = ensure_sequence('MAIL FROM', ignore); // false
     * 
     * 
     * @returns {boolean} Whether the sequence is in the correct order
     */
    public ensure_sequence(
        marker: string,
        ignore: Array<string> = []
    ): boolean {
        // -- Get the last 5 messages
        const last_messages = this._message_sequence.slice(-5);

        // -- Check if any of the messages are in the ignore list
        const ignore_messages = last_messages.filter(message => ignore.includes(message.content));
        if (ignore_messages.length > 0) return true;

        // -- Check if the marker is in the last 5 messages
        const marker_messages = last_messages.filter(message => message.content === marker);
        if (marker_messages.length > 0) return true;

        // -- Return false
        return false;
    }



    public set from_domain(from_domain: string) { this._from_domain = from_domain; }
    public get from_domain(): string { return this._from_domain; }

    public set locked(locked: boolean) { this._locked = locked; }
    public get locked(): boolean { return this._locked; }

    public set mode(mode: 'EHLO' | 'HELO') { this._mode = mode; }
    public get mode(): 'EHLO' | 'HELO' { return this._mode; }



    public get sending_data(): boolean { return this._sending_data; }
    public set sending_data(sending_data: boolean) { this._sending_data = sending_data; }

    public get data(): Array<string> { return this._data; }
    public set push_data(data: string) { 
        this._data.push(data);
        this._data_size += data.length;
    }


    public get data_size(): number { return this._data_size; }

    

    /**
     * @name process_sender
     * @description Processes the sender information
     * Eg. MAIL FROM: ... < ... >
     * 
     * @param {string} sender - The sender information
     * 
     * @returns {boolean} Whether the sender information is valid
     */
    public process_sender(
        sender: string
    ): boolean {
        // -- Check for a username :<address>
        const spit = sender.split(':');
        if (spit.length !== 2) return false;
        const address = spit[1].trim()
            .replace('<', '')
            .replace('>', '');

        // -- Check if the sender information is valid
        const evaluater = new evp();
        if (!evaluater.isValidAddress(address)) return false;

        // -- Set the sender information
        this._from_domain = evaluater.domain;
        this._from_email_local = evaluater.local;

        // -- Return true
        return true;
    }



    /**
     * @name process_recipient
     * @description Processes the recipient information
     * eg ccs, note BCCs are handled by the client
     * 
     * @param {string} recipient - The recipient information
     * 
     * @returns {boolean} Whether the recipient information is valid
     */
    public process_recipient(
        recipient: string
    ): boolean {
        // -- Check for a username :<address>
        const spit = recipient.split(':');
        if (spit.length !== 2) return false;
        const address = spit[1].trim()
            .replace('<', '')
            .replace('>', '');

        // -- Check if the sender information is valid
        const evaluater = new evp();
        if (!evaluater.isValidAddress(address)) return false;

        // -- Add the recipient to the list of recipients
        this._ccs.push({
            domain: evaluater.domain,
            local: evaluater.local,
            user: ''
        });

        // -- Return true
        return true;
    }



    /**
     * @nave validate_username
     * @description Validates a given username
     * 
     * @param {string} username - The username to validate
     * 
     * @returns {boolean} Whether the username is valid
     */
    public static validate_username(
        username: string
    ): boolean {
        return user_name_regex.test(username);
    }



    /**
     * @name validate_address
     * @description Validates a given email address
     * 
     * @param {string} address - The address to validate
     * 
     * @returns {boolean} Whether the address is valid
     */
    public static validate_address(
        address: string
    ): boolean {
        return new evp().isValidAddress(address);
    }
}