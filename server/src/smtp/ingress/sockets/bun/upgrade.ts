import Configuration from '../../../../config';
import BaseSocket from '../../base_socket';
import RecvEmail from '../../../../email/recv';
import { JointSocket, WrappedSocket } from '../../../../types';


export default class UpgradeSocket extends BaseSocket {

    public socket: JointSocket;

    public constructor(
        public existing_socket: WrappedSocket
    ) {

        // -- The port is NIL as we are upgrading the connection from the NIL socket
        super('STARTTLS', Configuration.get_instance().get<number>('SMTP_PORTS', 'STARTTLS'));


                
        // @ts-ignore // -- This feature is not yet documented in the Bun library
        const sockets = existing_socket.upgradeTLS<RecvEmail>({
            data: existing_socket.data,
            
            tls: {
                key: Bun.file(this._config.get<string>('TLS', 'KEY')),
                cert: Bun.file(this._config.get<string>('TLS', 'CERT')),
            },

            socket: {
                data: (socket, data) => this.socket_data(socket, data),
                open: socket => this.socket_open(socket),
                close: socket => this.socket_close(socket),
                error: (socket, error) => this.socket_error(socket, error),
            }
        });


        // -- Set the socket
        this.socket = sockets[0];
        this.existing_socket = sockets[1];
    }
}