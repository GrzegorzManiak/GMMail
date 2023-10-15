import { log } from '../log';
import { IMailFrom } from '../smtp/types';
import { IAddress, IMessage, MessageStage, MessageType } from './types';
import evp from 'email-validator-pro';



const user_name_regex = /^(?!.*[._-]{2})[a-zA-Z0-9]+([._-]?[a-zA-Z0-9]+)*$/;



export default class RecvEmail {

    private readonly _id = crypto.randomUUID();
    private readonly _created_at = new Date();
        
    private _message_sequence: Array<IMessage> = [];
    private _markers: Map<string, string> = new Map();
    private _locked = false;
    private _mode: 'EHLO' | 'HELO';


    private _sending_data = false;
    private _data: Array<string> = [];
    private _data_size = 0;


    // -- Sender information
    private _mail_from: IMailFrom;
    private _rcpt_recipients: Array<IAddress> = [];


    // -- Extra information
    private _spam_score = 0;
    private _extra_map: Map<string, unknown> = new Map();



    /**
     * @class RecvEmail
     * @description Represents an email that is being received
     * from a client, for outbound emails, see SendEmail.
     * 
     * @param {string} _ip - The ip of the client sending the email
     * @param {number} _port - The port of the client sending the email
     */
    public constructor(
        private _ip: string,
        private _port: number,
    ) {}



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
    }



    /**
     * @name close
     * @description Closes the email, this is called when the email is finished
     * For now this is just a placeholder
     * 
     * @param {boolean} success - Whether the email was successfully sent
     */
    public close(
        success: boolean,
    ) {

    }



    /**
     * @name marker
     * @description Sets a marker for the email, eg HELO, EHLO, MAIL FROM, RCPT TO
     * this is vital to keep track of the email state
     * 
     * @param {string} marker - The marker to set
     */
    public set marker(
        marker: string
    ) { 
        this._markers.set(marker, marker); 
    }



    /**
     * @name has_marker
     * @description Checks if the email has a marker
     * 
     * @param {string} marker - The marker to check for
     * 
     * @returns {boolean} Whether the email has the marker
     */
    public has_marker(
        marker: string
    ): boolean {
        return this._markers.has(marker); 
    }



    /**
     * @name locked
     * @description Sets the locked state of the email
     * eg, if the email is locked, it cannot be modified
     * and messages will be ignored
     * 
     * @param {boolean} locked - The locked state of the email
     */
    public set locked(
        locked: boolean
    ) { 
        this._locked = locked; 
    }



    /**
     * @name locked
     * @description Gets the locked state of the email
     * 
     * @returns {boolean} The locked state of the email
     */
    public get locked(
    ): boolean { 
        return this._locked; 
    }



    /**
     * @name mode
     * @description Sets the mode of the email
     * There are two modes, EHLO and HELO
     * -> EHLO is the extended mode, it allows for more features
     * -> HELO is the basic mode, it allows for less features
     * 
     * @param {'EHLO' | 'HELO'} mode - The mode to set
     */
    public set mode(
        mode: 'EHLO' | 'HELO'
    ) { 
        if (this._mode) log('DEBUG', 'RecvEmail', 'mode', 'Mode already set');
        else this._mode = mode; 
    }



    /**
     * @name mode
     * @description Gets the mode of the email
     * 
     * @returns {'EHLO' | 'HELO'} The mode of the email
     */
    public get mode(
    ): 'EHLO' | 'HELO' { 
        if (!this._mode) log('ERROR', 'RecvEmail', 'mode', 'Mode not set');
        return this._mode; 
    }
    
    
    
    /**
     * @name process_sender
     * @description Processes the sender information
     * Eg. MAIL FROM: ... < ... > SIZE=... BODY=...
     * 
     * @param {string} sender - The sender information
     * 
     * @returns {IMailFrom | null} Whether the sender information is valid
     */
    public process_sender(
        sender: string
    ): IMailFrom | null {
        // -- Check for a username :<address>
        const spit = sender.split(':');
        if (spit.length !== 2) return;
        const address_split = spit[1].split('>'),
            address = address_split[0].trim().replace('<', '');
            

        // -- Check if the sender information is valid
        if (!RecvEmail.validate_address(address)) return;
        

        // -- Evalueate the parameters
        const split_params = spit[1].split('>')[1].trim().split(' '),
            split_address = address.split('@'),
            params = this._process_sender_params(split_params);

        // -- Check if the parameters are valid
        return {
            user: split_address[0],
            domain: split_address[1],
            size: params.size,
            body: params.body,
        };
    }



    /**
     * @name _process_sender_params
     * @description Processes the sender parameters
     * 
     * @param {Array<string>} split_params - The sender parameters
     * @param {Array<string>} [valid_params=['SIZE', 'BODY']] - The valid parameters
     * @param {Array<string>} [valid_body=['7BIT', '8BITMIME']] - The valid body types
     * @param {number} [size_max=2147483647] - The maximum size of the email
     * 
     * @returns {{
     *   size: number,
     *   body: '7BIT' | '8BITMIME',
     * }} The sender parameters
     */
    private _process_sender_params(
        split_params: Array<string>,
        valid_params = ['SIZE', 'BODY'],
        valid_body = ['7BIT', '8BITMIME'],
        size_max = 2147483647
    ): {
        size: number,
        body: '7BIT' | '8BITMIME',
    } {
        // -- Default parameters if none are given
        const default_params = {
            size: -1,
            body: '8BITMIME' as '7BIT' | '8BITMIME',
        };


        // -- Check if the parameters are valid
        split_params.forEach(param => {

            // -- Check if this param matches unknown of the valid params
            const param_split = param.split('=');
            if (param_split.length !== 2) return;


            // -- Check if the param is valid
            const param_name = param_split[0].toUpperCase(),
                param_value = param_split[1].toUpperCase();

                
            // -- Check if the param is valid
            if (!valid_params.includes(param_name)) return;


            // -- Check if the param is valid
            switch (param_name) {
                case 'SIZE':
                    const size = parseInt(param_value);
                    if (isNaN(size) || size > size_max) return;
                    default_params.size = size;
                    break;

                case 'BODY':
                    if (!valid_body.includes(param_value)) return;
                    default_params.body = param_value as '7BIT' | '8BITMIME';
                    break;
            }
        });



        // -- Return the parameters
        return default_params;
    }



    /**
     * @name process_recipient
     * @description Processes the recipient information
     * eg ccs, note BCCs are handled by the client
     * 
     * @param {string} recipient - The recipient information
     * 
     * @returns {IAddress | null} Whether the recipient information is valid
     */
    public process_recipient(
        recipient: string
    ): IAddress | null {
        // -- Check for a username :<address>
        const spit = recipient.split(':');
        if (spit.length !== 2) return;
        const address = spit[1].trim()
            .replace('<', '')
            .replace('>', '');

        // -- Check if the sender information is valid
        if (!RecvEmail.validate_address(address)) return;

        // -- Return the address
        const split = address.split('@');
        return {
            domain: split[1],
            local: split[0],
        };
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



    /**
     * @name sending_data
     * @description Gets the sending_data state of the email
     * -> true: Meaning that the client called DATA Successfully and is sending data
     * -> false: Meaning that the client has not called DATA or has finished sending data
     * 
     * @returns {boolean} The sending_data state of the email
     */
    public get sending_data(
    ): boolean { 
        return this._sending_data; 
    }



    /**
     * @name sending_data
     * @description Sets the sending_data state of the email
     * 
     * Caution: This should only be set by the client and not 
     * touched by the server / extensions
     * 
     * @param {boolean} sending_data - The sending_data state of the email
     */
    public set sending_data(
        sending_data: boolean
    ) { 
        this._sending_data = sending_data; 
    }



    /**
     * @name data
     * @description Gets the data of the email if
     * the client sent anything.
     * 
     * Note: this is not just all data, this is the data
     * that the client sent after calling DATA command.
     * 
     * @returns {Array<string>} The data of the email
     */
    public get data(
    ): Array<string> { 
        return this._data; 
    }



    /**
     * @name push_data
     * @description Pushes data to the email
     * 
     * Caution: This should only be set by the client and not
     * touched by the server / extensions
     * 
     * @param {string} data - The data to push
     */
    public set push_data(
        data: string
    ) { 
        this._data.push(data);
        this._data_size += data.length;
    }
    


    /**
     * @name data_size
     * @description Gets the size of the data of the email
     * in bytes
     * 
     * @returns {number} The size of the data of the email
     */
    public get data_size(
    ): number { 
        return this._data_size; 
    }



    /**
     * @name sender
     * @description Gets the sender of the email
     * 
     * @returns {IMailFrom} The sender of the email
     */
    public get sender(
    ): IMailFrom { 
        if (!this._mail_from) log('ERROR', 'RecvEmail', 'sender', 'Sender not set');
        return this._mail_from; 
    }



    /**
     * @name sender
     * @description Sets the sender of the email
     * 
     * @param {IMailFrom} sender - The sender of the email
     */
    public set sender(
        sender: IMailFrom
    ) { 
        this._mail_from = sender; 
    }



    /**
     * @name rcpt_recipient
     * @description Adds a recipient to the email
     * 
     * Note: these are not recipients that the client sent 
     * within the DATA block, these are recipients that the
     * client sent with RCPT TO command
     * 
     * @param {IAddress} address - The recipient address to add
     */
    public set rcpt_recipient(
        address: IAddress
    ) { 
        this._rcpt_recipients.push(address); 
    }



    /**
     * @name rcpt_recipients
     * @description Gets the list of recipients of the email
     * 
     * Note: these are not recipients that the client sent 
     * within the DATA block, these are recipients that the
     * client sent with RCPT TO command
     * 
     * @returns {Array<IAddress>} The list of recipients of the email
     */
    public get rcpt_recipients(
    ): Array<IAddress> { 
        return this._rcpt_recipients; 
    }


    /**
     * @name id
     * @description Gets the id of this email instance
     * NOTE: This is the same ID that is stored in the database
     * 
     * @returns {string} The id of this email instance
     */
    public get id(
    ): string { 
        return this._id;
    }



    /**
     * @name created_at
     * @description Gets the date that this email transaction
     * was initiated at
     * 
     * @returns {Date} The date that this email transaction was initiated at
     */
    public get created_at(
    ): Date { 
        return this._created_at;
    }



    /**
     * @name spam_score
     * @description Gets the spam score of the email
     * Ranges from 0 to 1
     * 
     * @returns {number} The spam score of the email
     */
    public get spam_score(
    ): number { 
        // -- Min max the spam score
        if (this._spam_score < 0) this._spam_score = 0;
        else if (this._spam_score > 1) this._spam_score = 1;

        // -- Return the spam score
        return this._spam_score;
    }



    /**
     * @name spam_score
     * @description Sets the spam score of the email
     * Ranges from 0 to 1
     */
    public set spam_score(
        spam_score: number
    ) { 
        // -- Min max the spam score
        if (spam_score < 0) this._spam_score = 0;
        else if (spam_score > 1) this._spam_score = 1;

        // -- Round the spam score to 2 decimal places
        this._spam_score = Math.round(this._spam_score * 100) / 100;
        
        // -- Set the spam score
        this._spam_score = spam_score;
    }



    /**
     * @name ip
     * @description Gets the IP address of the client
     * Note: This is probably not the actual IP address
     * as proxies, CloudFlare, etc. can mask the IP address
     * 
     * @returns {string} The IP address of the client
     */
    public get ip(
    ): string {
        return this._ip;
    }



    /**
     * @name port
     * @description Gets the port number of the client
     * 
     * @returns {number} The port number.
     */
    public get port(
    ): number {
        return this._port;
    }



    /**
     * @name get_extra
     * @description Gets additional data from the extra
     * data map, these can be set with ```set_extra```
     * 
     * @template T - The type of the value.
     * 
     * @param {string} key - The key to get the value for.
     * 
     * @returns {T} The value for the key.
     */
    public get_extra<T>(
        key: string
    ): T {
        return this._extra_map.get(key) as T;
    }



    /**
     * @name set_extra
     * @description Sets additional data in the extra
     * data map, these can be retrieved with ```get_extra```
     * 
     * @param {string} key - The key to set the value for.
     * @param {unknown} value - The value to set.
     * 
     * @returns {void} Nothing.
     */
    public set_extra(
        key: string, 
        value: unknown
    ): void {
        this._extra_map.set(key, value);
    }
}