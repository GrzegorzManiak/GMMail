import Configuration from '../../../../config';
import { JointSocket, WrappedSocket } from '../../../../types';
import BaseSocket from '../../base_socket';

import { TLSSocket } from 'tls';
import { Socket as NodeSocket } from 'net';



export default class UpgradeSocket extends BaseSocket {

    public socket: JointSocket;

    public constructor(
        public existing_socket: WrappedSocket
    ) {

        // -- The port is NIL as we are upgrading the connection from the NIL socket
        super('UPGRADE', Configuration.get_instance().get<number>('SMTP_PORTS', 'STARTTLS'));

        // -- Ensure that the existing socker is of instance NodeSocket
        if (!existing_socket || !(existing_socket instanceof NodeSocket)
        ) throw new Error('Cannot upgrade socket. Existing socket is not a NodeSocket');
        


        // -- Create the socket
        const tls_socket = new TLSSocket(existing_socket, {
            ...this.tls_options,
            isServer: true
        });


        // @ts-ignore
        tls_socket.data = existing_socket.data;

        // @ts-ignore
        this.socket_upgrade(tls_socket);


        // @ts-ignore
        tls_socket.on('data', data => this.socket_data(tls_socket, data));
        // @ts-ignore
        tls_socket.on('error', error => this.socket_error(tls_socket, error));
        // @ts-ignore
        tls_socket.on('close', () => this.socket_close(tls_socket));
    }
}