import RecvEmail from '../../email/recv';
import ExtensionManager from '../../extensions/main';
import { IRsetExtensionData, IRsetExtensionDataCallback } from '../../extensions/types';
import { log } from '../../log';
import SMTP from '../smtp';
import { CommandMap } from '../types';



/**
 * @name RSET
 * @description Processes the RSET command
 * which just resets everything to before
 * the client sent unknown commands
 * 
 * https://www.ibm.com/docs/en/zvm/7.3?topic=commands-rset
 */
export default (commands_map: CommandMap) => 
    commands_map.set('RSET', (socket, email, words, raw_data) => {

    // -- Either HELO or EHLO has to be sent before RSET
    if (
        !email.has_marker('HELO') && 
        !email.has_marker('EHLO')
    ) {
        email.send_message(socket, 503, 'Bad sequence of commands');
        email.close(socket, false);
        return;
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
    extensions._get_command_extension_group('RSET').forEach((callback: IRsetExtensionDataCallback) => 
        callback(extension_data));



    // -- Create the email object
    const { remoteAddress } = socket,
        new_email = new RecvEmail(remoteAddress, email.socket_mode);

    // -- Close of the email
    email.send_message(socket, 250);
    const old_mode = email.mode;

    // -- Configure the new email
    socket.data = new_email;
    new_email.locked = false;
    new_email.mode = old_mode;
    new_email.marker = old_mode;
    new_email.marker = 'RSET';
});