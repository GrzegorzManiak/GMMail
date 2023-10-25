import ExtensionManager from '../../extensions/main';
import { IRCPTTOExtensionData, IRcptToExtensionDataCallback } from '../../extensions/types';
import { log } from '../../log';
import SMTP from '../smtp';
import { CommandMap } from '../types';



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
        email.send_message(socket, 503, 'Bad sequence of commands');
        email.close(socket, false);
        return;
    }


    // -- Parse the MAIL FROM
    const recipient = email.process_recipient(raw_data);
    if (!recipient) {
        email.send_message(socket, 553, 'Invalid recipient');
        email.close(socket, false);
        return;
    }
    

    // -- If we should allow this CC to be added to the email
    let allow_cc = true, final = false;
    const extensions = ExtensionManager.get_instance();
    extensions._get_command_extension_group('RCPT TO').forEach((callback: IRcptToExtensionDataCallback) => {

        // -- Check if the final callback has been called
        if (final) return;

        // -- Construct the extension data
        const extension_data: IRCPTTOExtensionData = {
            email, socket, log,
            words, raw_data, recipient,
            smtp: SMTP.get_instance(),
            type: 'RCPT TO',
            action: (action) => {
                allow_cc = (action === 'ALLOW' || action === 'ALLOW:FINAL');
                if (action === 'ALLOW:FINAL' || action === 'DENY:FINAL') final = true;
            }
        };


        // -- Run the callback
        try {
            log('DEBUG', 'SMTP', 'process', `Running RCPT TO extension`);
            callback(extension_data);
        }

        // -- If there was an error, log it
        catch (err) {
            log('ERROR', 'SMTP', 'process', `Error running RCPT TO extension`, err);
        }

        // -- Finally, delete the extension data
        finally {
            delete extension_data.log;
            delete extension_data.words;
            delete extension_data.raw_data;
            delete extension_data.type;
            delete extension_data.action;
            delete extension_data.recipient;
        }
    });



    // -- If the extension data was returned, don't add the CC
    if (!allow_cc) email.send_message(socket, 450);
    
    // -- Add the CC to the email
    email.rcpt_recipient = recipient;
    email.marker = 'RCPT TO';
    email.send_message(socket, 250);
});