import Configuration from '../../../../config';
import BaseSocket from '../../base_socket';
import RecvEmail from '../../../../email/recv';
import { JointSocket } from '../../../../types';




export default class TlsSocket extends BaseSocket {
    public constructor() {
        super('SSL', Configuration.get_instance().get<number>('SMTP_PORTS', 'SSL'));


        
        this._socket = Bun.listen<RecvEmail>({
            hostname: this._config.get<string>('HOST'),
            port: this._port,

            tls: {
                key: Bun.file(this._config.get<string>('TLS', 'KEY')),
                cert: Bun.file(this._config.get<string>('TLS', 'CERT')),
            },

            socket: {
                // -- This is done this way to accomidate the node socket
                open: (socket) => {
                    const email_object = this.socket_open(socket);
                    socket.data = email_object;
                },
                
                data: (socket, data) => this.socket_data(socket, data),
                close: socket => this.socket_close(socket),
                error: (socket, error) => this.socket_error(socket, error),
            }
        });

        this._socket.ref();
    }
}