import { TCPSocketListener, Socket as BunSocket } from 'bun';
import { log } from '../../log';
import { SocketType } from '../types';
import Configuration from '../../config';
import CODE from '../commands/CODE';
import RecvEmail from '../../email/recv';
import SMTPIngress from './ingress';

export default class BaseSocket {
    protected _socket_type: SocketType;
    protected _socket: TCPSocketListener<unknown>;
    protected _port: number;

    protected _config: Configuration;
    protected _smtp_ingress: SMTPIngress;

    constructor(
        socket_type: SocketType,
        port: number
    ) {
        this._config = Configuration.get_instance();
        this._smtp_ingress = SMTPIngress.get_instance();
        
        log('DEBUG', 'Socket', 'constructor', `Creating socket on port ${port} with type ${socket_type} => ${this._config.get<string>('HOST')}:${port}`);
        this._socket_type = socket_type;
        this._port = port;
    }


    public get socket_type(): SocketType { return this._socket_type; }
    public kill(): void { log('ERROR', 'NOT IMPLEMENTED', 'Socket', 'kill', 'Socket.kill() is not implemented'); }



    protected socket_data = (
        socket: BunSocket<unknown>, 
        data: Buffer,
        port: number,
    ) => {

        // -- Ensure the socket has data
        if (!socket.data) {
            log('ERROR', 'Socket', 'constructor', `Socket data on port ${port} without email`);
            socket.write(CODE(451, 'EMail Object not found'))
            socket.end();
            return;
        }   

        // -- Parse the data
        const data_string = data.toString();

        // -- Get the email object
        const email = socket.data as RecvEmail;
        email.push_message('recv', 250, data_string);

        // -- Parse the data based on the stage
        this._smtp_ingress.process(data_string, email, socket);
    };



    protected socket_open = (
        socket: BunSocket<unknown>,
        port: number,
        mode: SocketType
    ) => {
        // -- Get the senders IP 
        const { remoteAddress } = socket;
        log('DEBUG', 'Socket', 'constructor', `Socket opened on port ${port} from ${remoteAddress} with mode ${mode}`);

        // -- Create the email object
        const email = new RecvEmail(socket, mode);
        socket.data = email;

        // -- Push the greeting
        email.send_message(socket, 220);
    };



    protected socket_close = (
        socket: BunSocket<unknown>,
        port: number,
    ) => {
        log('DEBUG', 'Socket', 'constructor', `Socket closed on port ${port}`);

        // -- Check if the socket has data
        if (
            !socket.data ||
            !(socket.data instanceof RecvEmail)
        ) return;

        // -- Close the email object
        const email = socket.data as RecvEmail;
        email.close(socket, true);
    };



    protected socket_drain = (
        socket: BunSocket<unknown>,
        port: number,
    ) => {
        log('DEBUG', 'Socket', 'constructor', `Socket drained on port ${port}`);
    };



    protected socket_error = (
        socket: BunSocket<unknown>,
        error: Error,
        port: number,
    ) => {
        log('ERROR', 'Socket', 'constructor', `Socket error on port ${port}: ${error}`);

        // -- Check if the socket has data
        if (
            !socket.data ||
            !(socket.data instanceof RecvEmail)
        ) return;

        // -- Close the email object
        const email = socket.data as RecvEmail;
        email.close(socket, false);
    };
}
