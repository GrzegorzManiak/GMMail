import ExtensionManager from '../../extensions/main';
import { IMailFromExtensionData, IMailFromExtensionDataCallback } from '../../extensions/types';
import { log } from '../../log';
import SMTP from '../ingress/ingress';
import { CommandMap } from '../types';



/**
 * @name I_MAIL_FROM
 * @description Processes the MAIL FROM command
 * MAIL FROM: < ... >
 * 
 * https://www.ibm.com/docs/en/zvm/7.3?topic=commands-mailfrom
 */
export const I_MAIL_FROM = (commands_map: CommandMap) => commands_map.set('MAIL FROM', 
    (socket, email, words, raw_data) => new Promise(async(resolve, reject) => {
        
    // -- ensure that we are in the VALIDATE stage
    if (email.has_marker('MAIL FROM')) {
        email.send_message(socket, 503, 'Bad sequence of commands');
        email.close(socket, false);
        return reject();
    }


    // -- Parse the MAIL FROM
    const sender = email.process_sender(raw_data);
    if (sender === null) {
        email.send_message(socket, 553, 'Invalid sender');
        email.close(socket, false);
        return reject();
    }




    // -- Get the extensions
    let allow_sender = true, final = false;
    const extensions = ExtensionManager.get_instance();
    const extension_funcs = extensions._get_command_extension_group('MAIL FROM');
    for (let i = 0; i < extension_funcs.length; i++) {

        // -- Check if the final callback has been called
        if (final) break;

        // -- Prepare the extension data
        const extension_data: IMailFromExtensionData = {
            log, email, socket,
            words, raw_data, sender,
            smtp: SMTP.get_instance(),
            type: 'MAIL FROM',
            extension_id: extension_funcs[i].id,
            extensions: extensions,
            action: (action) => {
                allow_sender = (action === 'ALLOW' || action === 'ALLOW:FINAL');
                if (action === 'ALLOW:FINAL' || action === 'DENY:FINAL') final = true;
            }
        };


        // -- Run the callback
        try {
            log('DEBUG', 'SMTP', 'process', `Running RCPT TO extension`);
            const extension_func = extension_funcs[i].callback as IMailFromExtensionDataCallback;
            await extension_func(extension_data);
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
            delete extension_data.sender;
        }
    }

    

    // -- Check if the extensions allowed the sender
    if (!allow_sender) {
        log('WARN', 'MAIL FROM was not allowed by an extension');
        email.marker = 'MAIL FROM';
        email.send_message(socket, 454);
        return resolve();
    }
    


    // -- Else, Set the sender
    email.sender = sender;
    email.marker = 'MAIL FROM';
    email.send_message(socket, 250);
    return resolve();
}));