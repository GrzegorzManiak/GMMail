import Configuration from '../config';
import { log } from '../log';
import Socket from './socket';
import NilSocket from './sockets/nil';
import { SocketType } from './types';



export default class SMTP {
    private static _instance: SMTP;
    private _sockets: Socket[];
    private _config: Configuration;
    private static _supported_features: string[] = [
        'EHLO',
        'DSN',
        'VRFY',
        'AUTH',
        'STARTTLS',
        '8BITMIME',
        'SIZE',
        'PIPELINING',
        'CHUNKING',
        'BINARYMIME',
        'ENHANCEDSTATUSCODES',
    ];



    private constructor() {
        log('DEBUG', 'SMTP', 'constructor', 'Creating SMTP sockets');
        this._sockets = [];
        this._config = Configuration.get_instance();

        // -- Load the SMTP sockets
        this._config.get<boolean>('SMTP', 'NIL') && this.load_socket('NIL');
        this._config.get<boolean>('SMTP', 'SSL') && this.load_socket('SSL');
        this._config.get<boolean>('SMTP', 'TLS') && this.load_socket('TLS');
    }

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
            case 'NIL':
                this._sockets.push(new NilSocket());
                break;

            case 'SSL':
                break;

            case 'TLS':
                break;
        }
    }



    /**
     * @name get_supported_features
     * @description Static function to get the list of supported features
     * in a format that can be sent to the client
     * 
     * @returns {string} The list of supported features
     */
    public static get_supported_features(): string {
        const features = SMTP._supported_features.map(feature => `250-${feature}`);
        return features.join('\r\n') + '\r\n250 HELP';
    }
}