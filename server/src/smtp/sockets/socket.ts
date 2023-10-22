import { Socket as BunSocket } from 'bun';
import Configuration from '../../config';
import { log } from '../../log';

import Socket from '../socket';
import RecvEmail from '../../email/recv';
import CODE from '../commands/CODE';
import process from '../process';
import { SocketType } from '../types';



export const socket_data = (
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
    const data_string = data.toString(),
        data_array = data_string.split('\r\n')
        .filter(line => line.length > 0);

    // -- Get the email object
    const email = socket.data as RecvEmail;
    email.push_message('recv', 250, data_string);

    // -- Parse the data based on the stage
    process(data_array, email, socket);
};



export const socket_open = (
    socket: BunSocket<unknown>,
    port: number,
    mode: SocketType
) => {
    // -- Get the senders IP 
    const { remoteAddress } = socket;
    log('DEBUG', 'Socket', 'constructor', `Socket opened on port ${port} from ${remoteAddress} with mode ${mode}`);

    // -- Create the email object
    const email = new RecvEmail(remoteAddress, mode);
    socket.data = email;

    // -- Push the greeting
    email.send_message(socket, 220);
};



export const socket_close = (
    socket: BunSocket<unknown>,
    port: number,
) => {
    log('DEBUG', 'Socket', 'constructor', `Socket closed on port ${port}`);
};



export const socket_drain = (
    socket: BunSocket<unknown>,
    port: number,
) => {
    log('DEBUG', 'Socket', 'constructor', `Socket drained on port ${port}`);
};



export const socket_error = (
    socket: BunSocket<unknown>,
    error: Error,
    port: number,
) => {
    log('ERROR', 'Socket', 'constructor', `Socket error on port ${port}: ${error}`);
    socket.end();
};