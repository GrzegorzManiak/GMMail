import HELO_EHLO from './HELO_EHLO';
import { CommandMap } from '../types';
import SMTP from '../ingress/ingress';



function check_ehlo(command: string): boolean {
    const regex = /^EHLO\s((([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9]))|((\d{1,3}\.){3}\d{1,3})|(\[(((\d{1,3}\.){3}\d{1,3})|(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9]))\])|(IPv6:([0-9A-Fa-f]{0,4}:){2,7}([0-9A-Fa-f]{0,4}))$/;
    return regex.test(command);
}



/**
 * @name I_EHLO
 * @description Processes the EHLO command
 * Returns the list of supported features
 * and the server greeting
 * 
 * https://www.ibm.com/docs/en/zvm/7.3?topic=commands-ehlo
 */
export const I_EHLO = (commands_map: CommandMap) => commands_map.set('EHLO', 
    (socket, email, words, raw_data, configuration) => new Promise((resolve, reject) => {

        
    // -- ensure that we are in the INIT stage
    if (
        email.has_marker('HELO') ||
        email.has_marker('EHLO')
    ) {
        email.send_message(socket, 503, 'Bad sequence of commands');
        email.close(socket, false);
        return reject();
    }



    // - Parse the HELO/EHLO
    const he = HELO_EHLO(words.join(' '));
    if (
        he.message_type === 'UNKNOWN' ||
        !check_ehlo(raw_data)
    ) {
        email.send_message(socket, 500, 'Unknown command');
        email.close(socket, false);
        return reject();
    }


    // -- Push the greeting
    email.send_message(socket, 2501);
    email.locked = true;


    // -- Get the supported features
    const smtp = SMTP.get_instance(),
        features = smtp.supported_features(email.socket_mode === 'PLAIN');

    // -- Send the features
    features.forEach(feature => {
        email.send_message(socket, 2503, feature);
        email.locked = true;
    });

    // -- Send the help message
    email.marker = 'EHLO';
    email.mode = 'EHLO';
    email.send_message(socket, 2504, 'HELP');
    return resolve();
}));
