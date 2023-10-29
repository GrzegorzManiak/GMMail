import Configuration from '../../../config';
import RecvEmail from '../../../email/recv';
import { NodeSocketUnion, WrappedSocket } from '../../types';
import BaseSocket from '../base_socket';
import { Socket as NodeSocket } from 'net';
import { connect, createServer as create_TLS_server, TlsOptions, TLSSocket } from 'tls';


export default class UpgradeSocket extends BaseSocket {

    public socket: NodeSocketUnion;

    public constructor(
        public existing_socket: WrappedSocket
    ) {

        // -- The port is NIL as we are upgrading the connection from the NIL socket
        super('STARTTLS', Configuration.get_instance().get<number>('SMTP_PORTS', 'NIL'));

        // -- Create the socket
        const tls_socket = new TLSSocket(existing_socket, {
            ...this.tls_options,
            isServer: true
        });


        // @ts-ignore
        tls_socket.data = existing_socket.data;

        // @ts-ignore
        this.socket_upgrade(tls_socket, this._port)


        // @ts-ignore
        tls_socket.on('data', data => this.socket_data(tls_socket, data));
        // @ts-ignore
        tls_socket.on('error', error => this.socket_error(tls_socket, error));
        // @ts-ignore
        tls_socket.on('close', () => this.socket_close(tls_socket));
    }
}