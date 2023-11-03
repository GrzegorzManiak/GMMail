import { createServer as create_server } from 'net';
import Configuration from '../../../../config';
import BaseSocket from '../../base_socket';
import { IConfig } from '../../../../config/types';
import { log } from '../../../../log';



export default class NilSocket extends BaseSocket {
    public constructor(
        port_key: keyof IConfig['SMTP_MODE']
    ) {
        super(port_key, Configuration.get_instance().get<number>('SMTP_PORTS', port_key));

        

        // -- Create the socket
        this._socket = create_server((socket) => {

            // -- Open the socket
            const email = this.socket_open(socket);
            // @ts-ignore
            socket.data = email;

            // @ts-ignore
            socket.on('data', data => this.socket_data(socket, data));
            // @ts-ignore
            socket.on('error', error => this.socket_error(socket, error));
            // @ts-ignore
            socket.on('close', () => this.socket_close(socket));
        });



        // -- Start listening
        this._socket.listen(
            this._port, 
            this._config.get<string>('HOST')
        );
    }
}