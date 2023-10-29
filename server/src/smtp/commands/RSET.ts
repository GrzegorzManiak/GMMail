import RecvEmail from '../../email/recv';
import ExtensionManager from '../../extensions/main';
import { IRsetExtensionData, IRsetExtensionDataCallback } from '../../extensions/types';
import { log } from '../../log';
import SMTP from '../ingress/ingress';
import { CommandMap } from '../types';



/**
 * @name I_RSET
 * @description Processes the RSET command
 * which just resets everything to before
 * the client sent unknown commands
 * 
 * https://www.ibm.com/docs/en/zvm/7.3?topic=commands-rset
 */
export const I_RSET = (commands_map: CommandMap) => commands_map.set('RSET',
    (socket, email, words, raw_data) => new Promise(async(resolve, reject) => {

    // -- Either HELO or EHLO has to be sent before RSET
    if (
        !email.has_marker('HELO') && 
        !email.has_marker('EHLO')
    ) {
        email.send_message(socket, 503, 'Bad sequence of commands');
        email.close(socket, false);
        return reject();
    }

    
    // -- Build the extension data
    const extension_data: IRsetExtensionData = {
        log, email, socket,
        words, raw_data,
        smtp: SMTP.get_instance(),
        type: 'RSET',
    };


    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    const promises = [];
    extensions._get_command_extension_group('RSET').forEach((callback: IRsetExtensionDataCallback) => 
        promises.push(callback(extension_data)));

    // -- Wait for all the promises to resolve
    await Promise.all(promises);


    // -- Close of the email
    email.reset_command();
    email.send_message(socket, 250);
    return resolve();
}));