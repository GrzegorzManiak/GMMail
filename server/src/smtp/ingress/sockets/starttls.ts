import { Socket as BunSocket } from 'bun';
import Configuration from '../../../config';
import BaseSocket from '../base_socket';
import RecvEmail from '../../../email/recv';



export default class NilSocket extends BaseSocket {
    public constructor() {
        super('NIL', Configuration.get_instance().get<number>('SMTP_PORTS', 'NIL'));
        
        this._socket = Bun.listen<RecvEmail>({
            hostname: this._config.get<string>('HOST'),
            port: this._port,
            socket: {
                data: (socket, data) => this.socket_data(socket, data, this._port),
                open: socket => this.socket_open(socket, this._port),
                close: socket => this.socket_close(socket, this._port),
                error: (socket, error) => this.socket_error(socket, error, this._port),
            }
        });
    }
}