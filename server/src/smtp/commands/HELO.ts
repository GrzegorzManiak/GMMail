import CODE from './CODE';
import HELO_EHLO from './HELO_EHLO';
import { CommandMap } from '../types';



/**
 * @name HELO
 * @description Processes the HELO command
 * Older, less useful version of EHLO, sends
 * only the server greeting
 */
export default (commands_map: CommandMap) =>  commands_map.set('HELO',
    (socket, email, words) => {

    // -- ensure that we are in the INIT stage
    if (email.has_marker('HELO')) {
        const error = CODE(503, 'Bad sequence of commands');
        email.push_message('send', error);
        email.close(false);
        socket.write(error);
        return;
    }



    // - Parse the HELO/EHLO
    const he = HELO_EHLO(words.join(' '));
    if (he.message_type === 'UNKNOWN') {
        const unknown = CODE(500, 'Unknown command');
        email.push_message('send', unknown);
        email.close(false);
        socket.write(unknown);
    }



    // -- Push the greeting
    const greetings = CODE(2501);
    email.push_message('send', greetings);
    socket.write(greetings);



    // -- Set the stage and unlock the email
    email.marker = 'HELO';
    email.from_domain = he.sender_domain;
    email.mode = 'HELO';
    email.locked = false;
});