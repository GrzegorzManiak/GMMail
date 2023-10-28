import { Socket as BunSocket } from 'bun';
import Configuration from '../../../config';
import BaseSocket from '../base_socket';
import RecvEmail from '../../../email/recv';



export default class TlsSocket extends BaseSocket {
    public constructor() {
        super('TLS', Configuration.get_instance().get<number>('SMTP_PORTS', 'TLS'));

        this._socket = Bun.listen({
            hostname: this._config.get<string>('HOST'),
            port: this._port,

            tls: {
                key: Bun.file(this._config.get<string>('TLS', 'KEY')),
                cert: Bun.file(this._config.get<string>('TLS', 'CERT')),
            },

            socket: {
                data: (socket, data) => this.socket_data(socket as BunSocket<RecvEmail>, data, this._port, 'TLS'),
                open: socket => this.socket_open(socket as BunSocket<RecvEmail>, this._port, 'TLS'),
                close: socket => this.socket_close(socket as BunSocket<RecvEmail>, this._port),
                error: (socket, error) => this.socket_error(socket as BunSocket<RecvEmail>, error, this._port),
            }
        });
    }
}