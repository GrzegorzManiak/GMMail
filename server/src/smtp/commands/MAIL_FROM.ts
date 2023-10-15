import { CommandMap } from '../types';
import CODE from './CODE';



/**
 * @name MAIL FROM
 * @description Processes the MAIL FROM command
 * MAIL FROM: < ... >
 */
export default (commands_map: CommandMap) => commands_map.set('MAIL FROM', 
    (socket, email, _, command) => {
        
    // -- ensure that we are in the VALIDATE stage
    if (email.has_marker('MAIL FROM')) {
        const error = CODE(503, 'Bad sequence of commands');
        email.push_message('send', error);
        email.close(false);
        socket.write(error);
        return;
    }


    // -- Parse the MAIL FROM
    const valid = email.process_sender(command);
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
    email.marker = 'MAIL FROM';
    socket.write(message);
    email.locked = false;
});