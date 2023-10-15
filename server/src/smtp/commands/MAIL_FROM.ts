import ExtensionManager from '../../extensions/main';
import { IMailFromExtensionData, IMailFromExtensionDataCallback } from '../../extensions/types';
import { log } from '../../log';
import SMTP from '../smtp';
import { CommandMap } from '../types';
import CODE from './CODE';



/**
 * @name MAIL FROM
 * @description Processes the MAIL FROM command
 * MAIL FROM: < ... >
 * 
 * https://www.ibm.com/docs/en/zvm/7.3?topic=commands-mailfrom
 */
export default (commands_map: CommandMap) => commands_map.set('MAIL FROM', 
    (socket, email, words, raw_data) => {
        
    // -- ensure that we are in the VALIDATE stage
    if (email.has_marker('MAIL FROM')) {
        const error = CODE(503, 'Bad sequence of commands');
        email.push_message('send', error);
        email.close(false);
        socket.write(error);
        return;
    }


    // -- Parse the MAIL FROM
    const sender = email.process_sender(raw_data);
    if (sender === null) {
        const invalid = CODE(553, 'FROM address invalid');
        email.push_message('send', invalid);
        email.close(false);
        socket.write(invalid);
        socket.end();
        return;
    }



    // -- Prepare the extension data
    const extension_data: IMailFromExtensionData = {
        log, email, socket,
        words, raw_data, sender,
        smtp: SMTP.get_instance(),
        type: 'MAIL FROM',
        _returned: false,
    };



    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    extensions._get_command_extension_group('MAIL FROM').forEach((callback: IMailFromExtensionDataCallback) => {

        // -- If the extensions have returned a response, return
        if (extension_data._returned) return;
        
        // -- Run the callback
        const response = callback(extension_data);
        if (!response) return;

        // -- Check the code
        if (
            typeof response === 'number' && 
            response !== 250
        ) {
            const message = CODE(response);
            email.push_message('send', message);
            socket.write(message);
            email.close(false);
            return;
        }
    });

    

    // -- Check if the extensions have returned a response
    if (extension_data._returned) return;

    // -- Set the sender
    email.sender = sender;

    // -- Unlock the email
    const message = CODE(250);
    email.push_message('send', message);
    email.marker = 'MAIL FROM';
    socket.write(message);
    email.locked = false;
});