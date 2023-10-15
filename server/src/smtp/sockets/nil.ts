import { Socket as BunSocket } from 'bun';
import Configuration from '../../config';
import { log } from '../../log';

import Socket from '../socket';
import Email from '../../email/email';
import CODE from '../messages/CODE';
import SMTP from '../smtp';
import HELO_EHLO from '../messages/HELO_EHLO';
import process from '../process';




export default class NilSocket extends Socket {
    public constructor() {
        super('NIL', Configuration.get_instance().get<number>('SMTP_PORTS', 'NIL'));
        
        this._socket = Bun.listen({
            hostname: this._config.get<string>('HOST'),
            port: this._port,
            socket: {



            async data(socket, data) {

                // -- Ensure the socket has data
                if (!socket.data) {
                    log('ERROR', 'Socket', 'constructor', `Socket data on port ${this._port} without email`);
                    socket.write(CODE(451, 'EMail Object not found'))
                    socket.end();
                    return;
                }   

                // -- Parse the data
                const data_string = data.toString(),
                    data_array = data_string.split('\r\n')
                    .filter(line => line.length > 0);

                // -- Get the email object
                const email = socket.data as Email;
                email.push_message('recv', data_string);

                // -- If the email is locked, return an error
                // if (email.locked) {
                //     log('ERROR', 'Socket', 'constructor', `Socket data on port ${this._port} with locked email`);
                //     const locked = CODE(503);
                //     email.push_message('send', locked);
                //     email.close(false);
                //     socket.write(locked);
                //     socket.end();
                //     return;
                // }



                // -- Parse the data based on the stage
                process(data_array, email, socket);
            },



            open(socket: BunSocket<any>) {
                // -- Create the email object
                const email = new Email();
                socket.data = email;

                // -- Push the greeting
                const greetings = CODE(220);
                email.push_message('send', greetings);

                // -- Send the greeting
                socket.write(greetings);
            },



            close(socket) {
                log('DEBUG', 'Socket', 'constructor', `Socket closed on port ${this._port}`);
            },



            drain(socket) {
                log('DEBUG', 'Socket', 'constructor', `Socket drained on port ${this._port}`);
            },


            
            error(socket, error) {
                log('ERROR', 'Socket', 'constructor', `Socket error on port ${this._port}: ${error}`);
            }, 


        }});
    }
}