import { TCPSocketListener } from 'bun';
import { log } from '../log';
import { SocketType } from './types';
import Configuration from '../config';

export default class Socket {
    protected _socket_type: SocketType;
    protected _socket: TCPSocketListener<any>;
    protected _port: number;

    protected _config: Configuration;

    constructor(
        socket_type: SocketType,
        port: number
    ) {
        this._config = Configuration.get_instance();
        
        log('DEBUG', 'Socket', 'constructor', `Creating socket on port ${port} with type ${socket_type} => ${this._config.get<string>('HOST')}:${port}`);
        this._socket_type = socket_type;
        this._port = port;
    }


    public get socket_type(): SocketType { return this._socket_type; }
    public kill(): void { log('ERROR', 'NOT IMPLEMENTED', 'Socket', 'kill', 'Socket.kill() is not implemented'); }
}