import CODE from './CODE';
import SMTP from '../smtp';
import { log } from '../../log';
import ExtensionManager from '../../extensions/main';
import { IDATAExtensionData, IDATAExtensionDataCallback } from '../../extensions/types';
import { CommandMap } from '../types';



/**
 * @name DATA
 * @description Processes the DATA command
 * DATA ... CRLF . CRLF
 * 
 * https://www.ibm.com/docs/en/zvm/7.2?topic=commands-data
 */
export default (commands_map: CommandMap) => commands_map.set('DATA', 
    (socket, email, words, raw_data) => {
        
    // -- Ensure that there is only the DATA command
    //    HELO/EHLO and RCPT TO have to be sent before DATA
    if (
        email.has_marker('DATA') ||
        !email.has_marker('RCPT TO') ||
        !(
            email.has_marker('HELO') ||
            email.has_marker('EHLO')
        )
    ) {
        const error = CODE(503);
        email.push_message('send', error);
        email.close(false);
        socket.write(error);
        return;
    }


    // -- Ensure that theres no parameters
    if (words.length > 1) {
        const error = CODE(501);
        email.push_message('send', error);
        email.close(false);
        socket.write(error);
        return;
    }



    // -- Build the extension data
    const extension_data: IDATAExtensionData = {
        email, socket, log,
        words, raw_data,
        smtp: SMTP.get_instance(),
        type: 'DATA',
        total_size: email.data_size,
        current_size: 0,
        bypass_size_check: false,
        _returned: false,
        cancel(
            code
        ) {
            extension_data._returned = true;
            const message = CODE(code);
            email.push_message('send', message);
            socket.write(message);
            email.locked = false;
            return;
        }
    };



    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    extensions._get_command_extension_group('DATA').forEach((callback: IDATAExtensionDataCallback) => {

        // -- If other messages were sent, don't run the callback
        //    as only one non 250 message can be sent
        if (extension_data._returned === true) return;

        // -- Run the callback
        const response = callback(extension_data);
        if (!response) return;

        // -- Check the code
        if (
            response !== 250 &&
            extension_data._returned === false
        ) {
            const message = CODE(response);
            email.push_message('send', message);
            socket.write(message);
            return;
        }
    });



    // -- Push the data message
    const message = CODE(354);
    email.push_message('send', message);
    email.sending_data = true;
    socket.write(message);
    email.locked = false;
});