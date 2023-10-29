import { Socket as NodeSocket } from 'net';
import { createServer as create_TLS_server, TlsOptions } from 'tls';
import Configuration from '../../../config';
import BaseSocket from '../base_socket';



export default class TlsSocket extends BaseSocket {
    public constructor() {
        super('TLS', Configuration.get_instance().get<number>('SMTP_PORTS', 'TLS'));



        // -- Create the socket
        this._socket = create_TLS_server(this.tls_options, (socket: NodeSocket) => {

            // -- Open the socket
            const email = this.socket_open(socket, this._port);
            // @ts-ignore
            socket.data = email;

            // @ts-ignore
            socket.on('data', data => this.socket_data(socket, data, this._port));
            // @ts-ignore
            socket.on('error', error => this.socket_error(socket, error, this._port));
            // @ts-ignore
            socket.on('close', () => this.socket_close(socket, this._port));
        });



        // -- Start listening
        this._socket.listen(
            this._port, 
            this._config.get<string>('HOST')
        );
    }
}