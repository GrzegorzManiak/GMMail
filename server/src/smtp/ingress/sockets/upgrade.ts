import Configuration from '../../../config';
import RecvEmail from '../../../email/recv';
import BaseSocket from '../base_socket';
import { Socket as BunSocket } from 'bun';


export default class UpgradeSocket extends BaseSocket {

    public socket: BunSocket<RecvEmail>;

    public constructor(
        public existing_socket: BunSocket<RecvEmail>
    ) {

        // -- The port is NIL as we are upgrading the connection from the NIL socket
        super('STARTTLS', Configuration.get_instance().get<number>('SMTP_PORTS', 'NIL'));


        // @ts-ignore // -- This feature is not yet documented in the Bun library
        const sockets = existing_socket.upgradeTLS<RecvEmail>({
            data: existing_socket.data,
            
            tls: {
                key: Bun.file(this._config.get<string>('TLS', 'KEY')),
                cert: Bun.file(this._config.get<string>('TLS', 'CERT')),
            },

            socket: {
                data: (socket, data) => this.socket_data(socket, data, this._port),
                open: socket => this.socket_open(socket, this._port),
                close: socket => this.socket_close(socket, this._port),
                error: (socket, error) => this.socket_error(socket, error, this._port),
            }
        });


        // -- Set the socket
        this.socket = sockets[0];
        this.existing_socket = sockets[1];
    }
}