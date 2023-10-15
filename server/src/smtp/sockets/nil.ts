import { Socket as BunSocket } from 'bun';
import Configuration from '../../config';
import { log } from '../../log';
import greeting from '../messages/greeting';
import Socket from '../socket';
import Email from '../../email/email';
import CODE from '../messages/CODE';




export default class NilSocket extends Socket {
    public constructor() {
        super('NIL', Configuration.get_instance().get<number>('SMTP_PORTS', 'NIL'));
        
        this._socket = Bun.listen({
            hostname: this._config.get<string>('HOST'),
            port: this._port,
            socket: {


            data(socket, data) {

                // -- Ensure the socket has data
                if (!socket.data) {
                    log('ERROR', 'Socket', 'constructor', `Socket data on port ${this._port} without email`);
                    socket.write(CODE(451, 'EMAIL Object not found'))
                    socket.end();
                    return;
                }   
                
                // -- Parse the data
                const data_string = data.toString(),
                    data_array = data_string.split('\r\n');

                // -- Get the email object
                const email = socket.data as Email;
                email.push_message('recv', data_string);


                console.log(data_array);
            },


            open(socket: BunSocket<any>) {
                log('DEBUG', 'Socket', 'constructor', `Socket opened on port ${this._port}`);
                const email = new Email();
                socket.data = email;

                // -- Push the greeting
                const greetings = greeting();
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