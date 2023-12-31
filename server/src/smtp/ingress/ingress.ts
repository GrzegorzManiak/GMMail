import Configuration from '../../config';
import RecvEmail from '../../email/recv';
import { log } from '../../log';
import Socket from './base_socket';
import { CommandMap } from '../types';
import ExtensionManager from '../../extensions/main';
import { add_commands, process } from './interpreter';
import { SocketType, WrappedSocket } from '../../types';

import GMMail from '../../main';
import NodeSSLSocket from './sockets/node/ssl';
import NodePlainSocket from './sockets/node/plain';
import BunSSLSocket from './sockets/bun/ssl';
import BunPlainSocket from './sockets/bun/plain';



export default class SMTPIngress {
    private static _instance: SMTPIngress;
    private _extensions: ExtensionManager;
    private _commands_map: CommandMap = new Map();
    private _gmmail: GMMail;

    private _sockets: Socket[];
    private _config: Configuration;
    private _crlf = '.';
    
    

    // -- Supported features by the server
    private static _supported_features: string[] = [
        '8BITMIME',
        'VRFY',
        'SMTPUTF8',
        'STARTTLS'
    ];

    // -- Supported commands by the server
    private static _supported_commands: string[] = [
        'HELO',
        'EHLO',
        'MAIL FROM',
        'RCPT TO',
        'DATA',
        'HELP',

        'RSET',
        'NOOP',
        'QUIT',
        'VRFY',
        'EXPN',
        'STARTTLS'
    ];



    private constructor() {
        log('DEBUG', 'SMTPIngress', 'constructor', 'Creating SMTP sockets');
        this._sockets = [];
        this._config = Configuration.get_instance();
        this._extensions = ExtensionManager.get_instance();

        // -- Add the commands
        add_commands(this._commands_map);
    }



    /**
     * @name start_listening
     * @description Adds the socket listeners and starts listening
     * for incoming connections
     * 
     * @returns {void}
     */
    public start_listening(): void {
        log('DEBUG', 'SMTPIngress', 'start_listening', 'Creating SMTP sockets');

        // -- Load the SMTP sockets
        this._config.get<boolean>('SMTP', 'STARTTLS') && this._load_socket('STARTTLS');
        this._config.get<boolean>('SMTP', 'PLAIN') && this._load_socket('PLAIN');
        this._config.get<boolean>('SMTP', 'SSL') && this._load_socket('SSL');
    }   



    /**
     * @name get_instance
     * @description Returns the singleton instance of the SMTP class
     * Should not be called by unknownthing other than the root class
     * 
     * @returns {SMTPIngress} The singleton instance of the SMTP class
     */
    public static get_instance(): SMTPIngress {
        if (!SMTPIngress._instance) SMTPIngress._instance = new SMTPIngress();
        return SMTPIngress._instance;
    }



    /**
     * @name process
     * @description Processes the SMTP commands sent by the client
     * You can call the process function directly, but it is recommended
     * to use the SMTPIngress class instead.
     * 
     * @param {string} command - The command sent by the client
     * @param {RecvEmail} email - The email object that the client is connected to
     * @param {WrappedSocket} socket - The socket that the client is connected to
     * 
     * @returns {void} Nothing
     */
    public process = (
        command: string,
        email: RecvEmail,
        socket: WrappedSocket,
    ): Promise<void> => new Promise((resolve, reject) => {
        try {
            process(command, email, socket, this, this._config)
                .then(() => resolve())
                .catch((err) => reject(err));
        }

        catch (error) {
            log('ERROR', 'SMTPIngress', 'process', error);
            socket.end();
            reject(error);
        }
    });




    /**
     * @name _load_socket
     * @description Creates a new socket and adds it to the list of sockets
     * 
     * @param {SocketType} socket_type - The type of socket to load
     * 
     * @returns {void}
     */
    private _load_socket(
        socket_type: SocketType
    ) {
        // -- Check if the socket already exists
        if (this._sockets.find(socket => socket.socket_type === socket_type)) return log(
            'WARN', 'SMTPIngress', 'load_socket', `Socket already loaded: ${socket_type}`);
            
        switch (GMMail.runtime) {
            case 'BUN': switch (socket_type) {
                case 'STARTTLS': this._sockets.push(new BunPlainSocket('STARTTLS')); break;
                case 'PLAIN': this._sockets.push(new BunPlainSocket('PLAIN')); break;
                case 'SSL': this._sockets.push(new BunSSLSocket()); break;
            }; break;

            case 'NODE': switch (socket_type) {
                case 'STARTTLS': this._sockets.push(new NodePlainSocket('STARTTLS')); break;
                case 'PLAIN': this._sockets.push(new NodePlainSocket('PLAIN')); break;
                case 'SSL': this._sockets.push(new NodeSSLSocket()); break;
            }; break;
        }
    }



    public get crlf(): string { return this._crlf; }
    public supported_features(
        starttls: boolean = false
    ): Array<string> { 
        const default_features = SMTPIngress._supported_features.filter(feature => feature !== 'STARTTLS' || starttls);

        // -- Extensions
        for (const [_, commands] of this._extensions._get_all_custom_ingress_commands()) commands.forEach((command) => {
            const feature = command.feature_name;
            if (feature && !default_features.includes(feature)) default_features.push(feature);
        });

        // -- Return the features
        return default_features;
    }

    public supported_commands(
        starttls: boolean = false
    ): Array<string> { 
        return SMTPIngress._supported_commands.filter(command => command !== 'STARTTLS' || starttls);
    }

    public get map() { return this._commands_map; }
}