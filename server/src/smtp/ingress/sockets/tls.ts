import Configuration from '../../../config';
import BaseSocket from '../base_socket';



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
                data: (socket, data) => this.socket_data(socket, data, this._port),
                open: socket => this.socket_open(socket, this._port, 'TLS'),
                close: socket => this.socket_close(socket, this._port),
                drain: socket => this.socket_drain(socket, this._port),
                error: (socket, error) => this.socket_error(socket, error, this._port),
            }
        });
    }
}