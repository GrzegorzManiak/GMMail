import { log } from '../../log';
import Configuration from '../../config';
import CODE from '../commands/CODE';
import RecvEmail from '../../email/recv';
import SMTPIngress from './ingress';
import fs from 'fs';
import { TlsOptions } from 'tls';
import { JointServer, JointSocket, SocketType, WrappedSocket } from '../../types';



export default class BaseSocket {
    protected _socket_type: SocketType;
    protected _socket: JointServer;
    protected _port: number;

    protected _config: Configuration;
    protected _smtp_ingress: SMTPIngress;

    protected tls_cert_path = Configuration.get_instance().get<string>('TLS', 'CERT');
    protected tls_key_path = Configuration.get_instance().get<string>('TLS', 'KEY');
    protected tls_cert = fs.readFileSync(this.tls_cert_path);
    protected tls_key = fs.readFileSync(this.tls_key_path);
    
    protected tls_options: TlsOptions = {
        key: this.tls_key,
        cert: this.tls_cert
    };

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



    protected socket_data = async (
        socket: WrappedSocket, 
        data: Buffer,
        port: number = this._port,
        socket_type: SocketType = this._socket_type
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
        console.log(email.socket_mode, socket_type);
        if (email.socket_mode !== socket_type) return;


        // -- Parse the data
        const data_string = data.toString();
        email.push_message('recv', 250, data_string);

        // -- Parse the data based on the stage
        await this._smtp_ingress.process(data_string, email, socket);
    };



    protected socket_open = (
        socket: JointSocket,
        port: number = this._port,
        mode: SocketType = this._socket_type
    ): RecvEmail => {
        // -- Get the senders IP 
        const { remoteAddress } = socket;
        log('DEBUG', 'Socket', 'constructor', `Socket opened on port ${port} from ${remoteAddress} with mode ${mode}`);

        // -- Create the email object
        const email = new RecvEmail(socket, mode);

        // -- Push the greeting
        email.send_message(socket, 220);
        return email;
    };



    protected socket_upgrade = (
        socket: WrappedSocket,
        port: number = this._port,
        mode: SocketType = this._socket_type
    ) => {

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

        // -- Log some information
        log('DEBUG', 'Socket', 'constructor', `Socket upgraded on port ${port} with mode ${mode}`);
    }



    protected socket_close = (
        socket: WrappedSocket,
        port: number = this._port,
        mode: SocketType = this._socket_type
    ) => {


        // -- Check if the socket has data
        if (
            !socket.data ||
            !(socket.data instanceof RecvEmail)
        ) {
            // socket.destroy();
            return;
        }


        // -- Get the email object
        const email = socket.data as RecvEmail,
            active_mode = email.socket_mode === mode ? mode : null;

        switch (active_mode) {
            case 'PLAIN':
            case 'STARTTLS':
            case 'SSL': {
                log('DEBUG', 'Socket', 'constructor', `Socket closed on port ${port} with mode ${active_mode}`);
                // email.close(socket, true);
                break;
            };


            case 'UPGRADE': {
                log('DEBUG', 'Socket', 'constructor', `Completed UPGRADE on port ${port}, closing socket`);
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
        socket: WrappedSocket,
        port: number = this._port,
    ) => {
        log('DEBUG', 'Socket', 'constructor', `Socket drained on port ${port}`);
    };



    protected socket_error = (
        socket: WrappedSocket,
        error: Error,
        port: number = this._port,
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
