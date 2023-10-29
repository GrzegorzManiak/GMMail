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
        socket: BunSocket<RecvEmail>, 
        data: Buffer,
        port: number,
        socket_type: SocketType  = this._socket_type
    ) => {

        // -- Ensure the socket has data
        if (
            !socket.data ||
            !(socket.data instanceof RecvEmail)
        ) {
            log('ERROR', 'Socket', 'constructor', `Socket data on port ${port} without email`);
            socket.write(CODE(451, 'EMail Object not found'))
            socket.end();
            return;
        }   


        // -- Get the email object, and make sure the socket mode is correct
        const email = socket.data as RecvEmail;
        if (email.socket_mode !== socket_type) return;


        // -- Parse the data
        const data_string = data.toString();
        email.push_message('recv', 250, data_string);

        // -- Parse the data based on the stage
        this._smtp_ingress.process(data_string, email, socket);
    };



    protected socket_open = (
        socket: BunSocket<RecvEmail>,
        port: number,
        mode: SocketType = this._socket_type
    ) => {
        switch (mode) {

            
            // -- These are the same, and they are invoked when a socket is opened
            //    on the TLS port, or the NIL port
            case 'NIL':
            case 'TLS': {

                // -- Get the senders IP 
                const { remoteAddress } = socket;
                log('DEBUG', 'Socket', 'constructor', `Socket opened on port ${port} from ${remoteAddress} with mode ${mode}`);

                // -- Create the email object
                const email = new RecvEmail(socket, mode);
                socket.data = email;

                // -- Push the greeting
                email.send_message(socket, 220);
                break;
            };


            // -- Where as STARTTLS can only be invoked by the STARTTLS command
            //    so we dont need to push the greeting, just validate the socket
            case 'STARTTLS': {

                // -- Ensure that the socket has data
                if (
                    !socket.data ||
                    !(socket.data instanceof RecvEmail)
                ) {
                    log('ERROR', 'Socket', 'constructor', `Socket data on port ${port} without email`);
                    socket.write(CODE(451, 'EMail Object not found'))
                    socket.end();
                    return;
                }

                // -- Log the STARTTLS
                log('DEBUG', 'Socket', 'constructor', `Completed STARTTLS on port ${port}`);
            }
        }
    };



    protected socket_close = (
        socket: BunSocket<RecvEmail>,
        port: number,
        mode: SocketType = this._socket_type
    ) => {


        // -- Check if the socket has data
        if (
            !socket.data ||
            !(socket.data instanceof RecvEmail)
        ) {
            socket.end();
            return;
        }


        // -- Get the email object
        const email = socket.data as RecvEmail,
            active_mode = email.socket_mode === mode ? mode : null;

        switch (active_mode) {
            case 'NIL':
            case 'TLS': {
                log('DEBUG', 'Socket', 'constructor', `Socket closed on port ${port} with mode ${active_mode}`);
                // email.close(socket, true);
                break;
            };


            case 'STARTTLS': {
                log('DEBUG', 'Socket', 'constructor', `Completed STARTTLS on port ${port}, closing socket`);
                // email.close(socket, true);
                break;
            }


            case null: {
                log('DEBUG', 'Socket', 'constructor', `Closing secondary socket on port ${port}`);
                // email.close(socket, true);
                break;
            }
        }
    };



    // -- Not used
    protected socket_drain = (
        socket: BunSocket<RecvEmail>,
        port: number,
    ) => {
        log('DEBUG', 'Socket', 'constructor', `Socket drained on port ${port}`);
    };



    protected socket_error = (
        socket: BunSocket<RecvEmail>,
        error: Error,
        port: number,
        mode: SocketType = this._socket_type
    ) => {
        log('ERROR', 'Socket', 'constructor', `Socket error on port ${port}: ${error}`);

        // -- Check if the socket has data
        if (
            !socket.data ||
            !(socket.data instanceof RecvEmail)
        ) socket.end();

        else {
            // -- Close the email object
            const email = socket.data as RecvEmail;
            email.close(socket, false);
        }
    };
}
