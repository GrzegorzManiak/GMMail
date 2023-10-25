import Configuration from '../../config';
import Socket from '../socket';
import {
    socket_data,
    socket_open,
    socket_close,
    socket_drain,
    socket_error,
} from './socket';



export default class TlsSocket extends Socket {
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
                data: (socket, data) => socket_data(socket, data, this._port),
                open: socket => socket_open(socket, this._port, 'TLS'),
                close: socket => socket_close(socket, this._port),
                drain: socket => socket_drain(socket, this._port),
                error: (socket, error) => socket_error(socket, error, this._port),
            }
        });
    }
}