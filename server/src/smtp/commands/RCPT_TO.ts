import { CommandMap } from '../types';
import CODE from './CODE';



/**
 * @name RCPT TO
 * @description Processes the RCPT TO command
 * RCPT TO: < ... >
 * 
 * https://www.ibm.com/docs/en/zvm/7.3?topic=commands-rcptto
 */
export default (commands_map: CommandMap) => commands_map.set('RCPT TO', 
    (socket, email, _, command) => {

    // -- This command has to be sent after MAIL FROM
    if (!email.has_marker('MAIL FROM')) {
        const error = CODE(503, 'Bad sequence of commands');
        email.push_message('send', error);
        email.close(false);
        socket.write(error);
        return;
    }


    // -- Parse the MAIL FROM
    const valid = email.process_recipient(command);
    if (!valid) {
        const invalid = CODE(553, 'FROM address invalid');
        email.push_message('send', invalid);
        email.close(false);
        socket.write(invalid);
        socket.end();
        return;
    }
    


    // -- Unlock the email
    const message = CODE(250);
    email.push_message('send', message);
    email.marker = 'RCPT TO';
    socket.write(message);
    email.locked = false;
});