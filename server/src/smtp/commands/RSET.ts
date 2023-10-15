import Configuration from '../../config';
import RecvEmail from '../../email/recv';
import ExtensionManager from '../../extensions/main';
import { IExtensionData, IExtensionDataCallback } from '../../extensions/types';
import { log } from '../../log';
import SMTP from '../smtp';
import { CommandMap } from '../types';
import CODE from './CODE';



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
        const error = CODE(503, 'Bad sequence of commands');
        email.push_message('send', error);
        email.close(false);
        socket.write(error);
        return;
    }


    
    // -- Build the extension data
    const extension_data: IExtensionData = {
        log, email, socket,
        words, raw_data,
        smtp: SMTP.get_instance(),
        type: 'QUIT',
    };


    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    extensions._get_command_extension_group('RSET').forEach((callback: IExtensionDataCallback) => 
        callback(extension_data));



    // -- Close of the email
    const message = CODE(250);
    email.push_message('send', message);
    email.close(false);


    // -- Create the email object
    const { remoteAddress } = socket,
        new_email = new RecvEmail(remoteAddress);
    socket.data = new_email;


    // -- Send the message
    socket.write(message);
    email.locked = false;
});