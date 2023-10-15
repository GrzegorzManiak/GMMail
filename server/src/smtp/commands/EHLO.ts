import CODE from './CODE';
import HELO_EHLO from './HELO_EHLO';
import { CommandMap } from '../types';
import SMTP from '../smtp';



/**
 * @name EHLO
 * @description Processes the EHLO command
 * Returns the list of supported features
 * and the server greeting
 */
export default (commands_map: CommandMap) => commands_map.set('EHLO', 
    (socket, email, words) => {

    // -- ensure that we are in the INIT stage
    if (email.has_marker('EHLO') || email.has_marker('HELO')) {
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



    // -- Only write the supported features if the command was EHLO
    const features = SMTP.get_instance()
        .supported_features.map(feature => '250-' + feature.toUpperCase() + '\r\n');
    features.push('250 HELP\r\n');
    features.forEach(feature => {
        email.push_message('send', feature);
        socket.write(feature);
    });


    // -- Set the stage and unlock the email
    email.marker = 'EHLO';
    email.from_domain = he.sender_domain;
    email.mode = 'EHLO';
    email.locked = false;
});