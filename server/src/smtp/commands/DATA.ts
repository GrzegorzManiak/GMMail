import SMTP from '../ingress/ingress';
import { log } from '../../log';
import ExtensionManager from '../../extensions/main';
import { IDATAExtensionData, IDataExtensionDataCallback } from '../../extensions/types';
import RecvEmail from '../../email/recv';
import Configuration from '../../config';

import { WrappedSocket } from '../../types';
import { CommandMap } from '../types';



/**
 * @name I_DATA
 * @description Processes the DATA command
 * DATA ... CRLF . CRLF
 * 
 * https://www.ibm.com/docs/en/zvm/7.2?topic=commands-data
 */
export const I_DATA = (commands_map: CommandMap) => commands_map.set('DATA', 
    (socket, email, words, raw_data, configuration) => new Promise(async(resolve, reject) => {
        
    // -- Ensure that there is only the DATA command
    //    HELO/EHLO and RCPT TO have to be sent before DATA
    if (
        email.has_marker('DATA') ||
        !email.has_marker('RCPT TO') ||
        !email.has_marker('MAIL FROM') ||
        !(
            email.has_marker('HELO') ||
            email.has_marker('EHLO')
        )
    ) {
        email.send_message(socket, 503);
        email.close(socket, false);
        return reject();
    }


    // -- Ensure that theres no parameters
    if (words.length > 1) {
        email.send_message(socket, 501);
        email.close(socket, false);
        return reject();
    }

    

    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    let allow_continue = true;
    const extension_funcs = extensions._get_command_extension_group('DATA');
    for (let i = 0; i < extension_funcs.length; i++) {

        // -- Build the extension data
        const extension_data: IDATAExtensionData = {
            email, socket, log,
            words: [], raw_data,
            data_lines: [],
            smtp: SMTP.get_instance(),
            type: 'DATA',
            current_size: 0,
            configuration,
            total_size: email.data_size,
            bypass_size_check: false,
            extension_id: extension_funcs[i].id,
            extensions: extensions,
            action: (action) => allow_continue = action === 'ALLOW'
        };

        // -- Run the callback
        try {
            log('DEBUG', 'SMTP', 'process', `Running DATA extension`);
            const extension_func = extension_funcs[i].callback as IDataExtensionDataCallback;
            await extension_func(extension_data);
        }

        // -- If there was an error, log it
        catch (err) {
            log('ERROR', 'SMTP', 'process', `Error running DATA extension`, err);
        }

        // -- Finally, delete the extension data
        finally {
            delete extension_data.log;
            delete extension_data.words;
            delete extension_data.raw_data;
            delete extension_data.type;
            delete extension_data.data_lines;
            delete extension_data.current_size;
            delete extension_data.bypass_size_check;
            delete extension_data.action;
        }
    }



    // -- Push the data message
    email.marker = allow_continue ? 'DATA' : 'DATA:DISALLOWED';
    email.sending_data = allow_continue;
    email.send_message(socket, allow_continue ? 354 : 250);
    return allow_continue ? resolve() : reject();
}));



/**
 * @name I_in_prog_data
 * @description Processes the data sent by the client
 * different from the DATA command as this is the data 
 * sent by the client
 * 
 * @param {RecvEmail} email - Current email object
 * @param {WrappedSocket} socket - Current socket
 * @param {string} command  - The command sent by the client
 * @param {Configuration} configuration - The current configuration
 * 
 * @returns 
 */
export const I_in_prog_data = (
    email: RecvEmail,
    socket: WrappedSocket,
    command: string,
    configuration: Configuration
): Promise<void> => new Promise(async(resolve, reject) => {
    // -- Ensure that the DATA command was sent
    if (
        !email.has_marker('DATA') ||
        email.has_marker('DATA:DISALLOWED')
    ) {
        email.send_message(socket, 503);
        email.close(socket, false);
        return reject();
    }

    // -- Get the size of the data the user is sending
    const current_size = command.length,
        data_lines = command.split('\n');


    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    let allow_continue = true, bypass_size_check = false;
    const extension_funcs = extensions._get_command_extension_group('DATA');
    for (let i = 0; i < extension_funcs.length; i++) {

        // -- Build the extension data
        const extension_data: IDATAExtensionData = {
            email, socket, log,
            words: [], raw_data: command,
            data_lines: [],
            smtp: SMTP.get_instance(),
            type: 'DATA',
            current_size: 0,
            total_size: email.data_size,
            bypass_size_check: false,
            extension_id: extension_funcs[i].id,
            extensions: extensions,
            configuration,
            action: (action) => allow_continue = action === 'ALLOW'
        };

        // -- Run the callback
        try {
            log('DEBUG', 'SMTP', 'process', `Running DATA extension`);
            const extension_func = extension_funcs[i].callback as IDataExtensionDataCallback;
            await extension_func(extension_data);
            bypass_size_check = extension_data.bypass_size_check;
        }

        // -- If there was an error, log it
        catch (err) {
            log('ERROR', 'SMTP', 'process', `Error running DATA extension`, err);
        }

        // -- Finally, delete the extension data
        finally {
            delete extension_data.log;
            delete extension_data.words;
            delete extension_data.raw_data;
            delete extension_data.type;
            delete extension_data.data_lines;
            delete extension_data.current_size;
            delete extension_data.bypass_size_check;
            delete extension_data.action;
        }
    }



    // -- Check if the extension allowed the data to be sent
    if (!allow_continue) {
        email.sending_data = false;
        email.send_message(socket, 552);
        email.close(socket, false);
        return resolve();
    }



    // -- Ensure that the data size is not exceeded
    if (!bypass_size_check) {
        const config = Configuration.get_instance(),
            max_size = config.get<number>('MAIL', 'MAX_SIZE');
            
        // -- Check if the size is exceeded
        if (current_size + email.data_size > max_size) {
            email.sending_data = false;
            email.send_message(socket, 552);
            email.close(socket, false);
            return resolve();
        }
    }



    // -- Loop through the data lines
    for (let i = 0; i < data_lines.length; i++) {

        // -- Get the current line
        const line = data_lines[i];

        // -- Check if the line is the end of the data
        //    if so, stop the loop, and send the message
        if (line.trim() === SMTP.get_instance().crlf) {
            email.sending_data = false;
            email.send_message(socket, 250);
            return resolve();
        }

        // -- Add the data to the email
        email.push_data = line;
    }
});