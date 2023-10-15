import ExtensionManager from '../../extensions/main';
import { IRCPTTOExtensionData, IRCPTTOExtensionDataCallback } from '../../extensions/types';
import { log } from '../../log';
import SMTP from '../smtp';
import { CommandMap } from '../types';
import CODE from './CODE';



const GOOD_CODES = [250, 251];



/**
 * @name RCPT TO
 * @description Processes the RCPT TO command
 * RCPT TO: < ... >
 * 
 * https://www.ibm.com/docs/en/zvm/7.3?topic=commands-rcptto
 */
export default (commands_map: CommandMap) => commands_map.set('RCPT TO', 
    (socket, email, words, raw_data) => {

    // -- This command has to be sent after MAIL FROM
    if (!email.has_marker('MAIL FROM')) {
        const error = CODE(503, 'Bad sequence of commands');
        email.push_message('send', error);
        email.close(false);
        socket.write(error);
        return;
    }


    // -- Parse the MAIL FROM
    const recipient = email.process_recipient(raw_data);
    if (recipient === null) {
        const invalid = CODE(553, 'FROM address invalid');
        email.push_message('send', invalid);
        email.close(false);
        socket.write(invalid);
        socket.end();
        return;
    }
    

    // -- If we should allow this CC to be added to the email
    let allow_cc = true;

    // -- Construct the extension data
    const extension_data: IRCPTTOExtensionData = {
        email, socket, log,
        words, raw_data, recipient,
        smtp: SMTP.get_instance(),
        type: 'RCPT TO',
        _returned: false,
        action: (action) => {
            allow_cc = action === 'ALLOW';
        }
    };


    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    extensions._get_command_extension_group('RCPT TO').forEach((callback: IRCPTTOExtensionDataCallback) => {

        // -- If the extension has already returned, don't run it again
        if (extension_data._returned) return;

        // -- Run the extension
        const response = callback(extension_data);
        if (!response) return;

        
        // -- If the response is not a 250 or 251
        //    return the user specified code
        if (!GOOD_CODES.includes(response)) {
            const message = CODE(response);
            email.push_message('send', message);
            socket.write(message);
            return;
        }
    });



    // -- If the extension data was returned, don't add the CC
    if (extension_data._returned) return;
    else if (allow_cc) {
        // -- Add the CC to the email
        email.recipient = recipient;

        // -- Unlock the email
        const message = CODE(250);
        email.push_message('send', message);
        email.marker = 'RCPT TO';
        socket.write(message);
        email.locked = false;
        return;
    }


    // -- Throw a 450, Mailbox unavailable
    const message = CODE(450);
    email.push_message('send', message);
    socket.write(message);
    email.locked = false;
    return;
});