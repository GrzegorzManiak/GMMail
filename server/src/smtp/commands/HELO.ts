import HELO_EHLO from './HELO_EHLO';
import { CommandMap } from '../types';



function check_helo(command: string): boolean {
    const regex = /^HELO\s((([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9]))|((\d{1,3}\.){3}\d{1,3})|(\[(((\d{1,3}\.){3}\d{1,3})|(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9]))\])|(IPv6:([0-9A-Fa-f]{0,4}:){2,7}([0-9A-Fa-f]{0,4}))$/;
    return regex.test(command);
}



/**
 * @name I_HELO
 * @description Processes the HELO command
 * Older, less useful version of EHLO, sends
 * only the server greeting
 * 
 * https://www.ibm.com/docs/en/zvm/7.3?topic=commands-helo
 */
export const I_HELO = (commands_map: CommandMap) =>  commands_map.set('HELO',
    (socket, email, words, raw_data) => new Promise((resolve, reject) => {

    // -- ensure that we are in the INIT stage
    if (
        email.has_marker('HELO') ||
        email.has_marker('EHLO')
    ) {
        email.send_message(socket, 503, 'Bad sequence of commands')
        email.close(socket, false);
        return reject();
    }



    // - Parse the HELO/EHLO
    const he = HELO_EHLO(words.join(' '));
    if (
        he.message_type === 'UNKNOWN' ||
        !check_helo(raw_data)
    ) {
        email.send_message(socket, 500, 'Unknown command');
        email.close(socket, false);
        return reject();
    }



    // -- Set the stage and unlock the email
    email.marker = 'HELO';
    email.mode = 'HELO';
    email.send_message(socket, 2502);
    return resolve();
}));
