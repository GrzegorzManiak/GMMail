import Configuration from '../config';
import RecvEmail from '../email/recv';
import { log } from '../log';
import { CommandExtensionMap } from '../extensions/types';
import Socket from './socket';
import NilSocket from './sockets/nil';
import { SocketType } from './types';
import { Socket as BunSocket } from 'bun';
import ExtensionManager from '../extensions/main';
import { add_commands } from './process';
import TlsSocket from './sockets/tls';


export default class SMTP {
    private static _instance: SMTP;
    private _extensions: ExtensionManager;
    private _commands_map = new Map<string, (
        socket: BunSocket<unknown>, 
        email: RecvEmail,
        words: Array<string>,
        raw: string,
    ) => void>();
    
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
        log('DEBUG', 'SMTP', 'constructor', 'Creating SMTP sockets');
        this._sockets = [];
        this._config = Configuration.get_instance();
        this._extensions = ExtensionManager.get_instance();

        // -- Load the SMTP sockets
        this._config.get<boolean>('SMTP', 'NIL') && this.load_socket('NIL');
        this._config.get<boolean>('SMTP', 'TLS') && this.load_socket('TLS');

        // -- Add the commands
        add_commands(this._commands_map);
    }



    /**
     * @name get_instance
     * @description Returns the singleton instance of the SMTP class
     * Should not be called by unknownthing other than the root class
     * 
     * @returns {SMTP} The singleton instance of the SMTP class
     */
    public static get_instance(): SMTP {
        if (!SMTP._instance) SMTP._instance = new SMTP();
        return SMTP._instance;
    }



    /**
     * @name load_socket
     * @description Creates a new socket and adds it to the list of sockets
     * 
     * @param {SocketType} socket_type - The type of socket to load
     * 
     * @returns {void}
     */
    public load_socket(
        socket_type: SocketType
    ) {
        // -- Check if the socket already exists
        if (this._sockets.find(socket => socket.socket_type === socket_type)) return log(
            'WARN', 'SMTP', 'load_socket', `Socket already loaded: ${socket_type}`);
            
        switch (socket_type) {
            case 'NIL': this._sockets.push(new NilSocket()); break;
            case 'TLS': this._sockets.push(new TlsSocket()); break;;
        }
    }



    public get crlf(): string { return this._crlf; }
    public get supported_features(): Array<string> { return SMTP._supported_features; }
    public get supported_commands(): Array<string> { return SMTP._supported_commands; }

    public get map() { return this._commands_map; }
}