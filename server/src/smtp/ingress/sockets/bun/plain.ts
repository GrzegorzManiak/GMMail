import Configuration from '../../../../config';
import BaseSocket from '../../base_socket';
import RecvEmail from '../../../../email/recv';
import { IConfig } from '../../../../config/types';
import { log } from '../../../../log';


export default class NilSocket extends BaseSocket {
    public constructor(
        port_key: keyof IConfig['SMTP_MODE']
    ) {
        super(port_key, Configuration.get_instance().get<number>('SMTP_PORTS', port_key));
        log('DEBUG', 'SMTP', `Starting ${port_key} socket on port ${this._port}`);
        
        this._socket = Bun.listen<RecvEmail>({
            hostname: this._config.get<string>('HOST'),
            port: this._port,
            socket: {
                // -- This is done this way to accomidate the node socket
                open: (socket) => {
                    const email_object = this.socket_open(socket);
                    socket.data = email_object;
                },

                data: (socket, data) => this.socket_data(socket, data),
                close: (socket) => this.socket_close(socket),
                error: (socket, error) => this.socket_error(socket, error),
            }
        });

        this._socket.ref();
    }
}