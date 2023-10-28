import { Socket as BunSocket } from 'bun';
import Configuration from '../../../config';
import BaseSocket from '../base_socket';
import RecvEmail from '../../../email/recv';



export default class NilSocket extends BaseSocket {
    public constructor() {
        super('NIL', Configuration.get_instance().get<number>('SMTP_PORTS', 'NIL'));
        
        this._socket = Bun.listen({
            hostname: this._config.get<string>('HOST'),
            port: this._port,
            socket: {
                data: (socket, data) => this.socket_data(socket as BunSocket<RecvEmail>, data, this._port, 'NIL'),
                open: socket => this.socket_open(socket as BunSocket<RecvEmail>, this._port, 'NIL'),
                close: socket => this.socket_close(socket as BunSocket<RecvEmail>, this._port),
                error: (socket, error) => this.socket_error(socket as BunSocket<RecvEmail>, error, this._port),
            }
        });
    }
}