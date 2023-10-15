import Configuration from '../../config';
import RecvEmail from '../../email/recv';
import SMTP from '../smtp';
import { CommandMap } from '../types';
import CODE from './CODE';



/**
 * @name RSET
 * @description Processes the RSET command
 * which just resets everything to before
 * the client sent any commands
 * 
 * https://www.ibm.com/docs/en/zvm/7.3?topic=commands-rset
 */
export default (commands_map: CommandMap) => commands_map.set('RSET', (socket, email) => {
    // -- Either HELO or EHLO has to be sent before RSET
    if (
        !email.has_marker('HELO') && 
        !email.has_marker('EHLO')
    ) {
        const error = CODE(503, 'Bad sequence of commands');
        email.push_message('send', error);
        email.close(false);
        socket.write(error);
        return;
    }


    // -- Close of the email
    const message = CODE(250);
    email.push_message('send', message);
    email.close(false);


    // -- Create the email object
    const new_email = new RecvEmail();
    socket.data = new_email;


    // -- Send the message
    socket.write(message);
    email.locked = false;
});