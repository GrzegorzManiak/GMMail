import SMTP from '../ingress/ingress';
import { log } from '../../log';
import ExtensionManager from '../../extensions/main';
import { IDATAExtensionData, IDataExtensionDataCallback } from '../../extensions/types';
import { CommandMap, WrappedSocket } from '../types';
import RecvEmail from '../../email/recv';
import { Socket as NodeSocket } from 'net';
import Configuration from '../../config';



/**
 * @name I_DATA
 * @description Processes the DATA command
 * DATA ... CRLF . CRLF
 * 
 * https://www.ibm.com/docs/en/zvm/7.2?topic=commands-data
 */
export const I_DATA = (commands_map: CommandMap) => commands_map.set('DATA', 
    (socket, email, words, raw_data) => {
        
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
        return;
    }


    // -- Ensure that theres no parameters
    if (words.length > 1) {
        email.send_message(socket, 501);
        email.close(socket, false);
        return;
    }

    

    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    let allow_continue = true;
    extensions._get_command_extension_group('DATA').forEach((callback: IDataExtensionDataCallback) => {

        // -- Build the extension data
        const extension_data: IDATAExtensionData = {
            email, socket, log,
            words: [], raw_data,
            data_lines: [],
            smtp: SMTP.get_instance(),
            type: 'DATA',
            current_size: 0,
            total_size: email.data_size,
            bypass_size_check: false,
            action: (action) => allow_continue = action === 'ALLOW'
        };

        // -- Run the callback
        try {
            log('DEBUG', 'SMTP', 'process', `Running DATA extension`);
            callback(extension_data);
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
    });



    // -- Push the data message
    email.marker = allow_continue ? 'DATA' : 'DATA:DISALLOWED';
    email.sending_data = allow_continue;
    email.send_message(socket, allow_continue ? 354 : 250);
});



/**
 * @name I_in_prog_data
 * @description Processes the data sent by the client
 * different from the DATA command as this is the data 
 * sent by the client
 * 
 * @param {RecvEmail} email - Current email object
 * @param {WrappedSocket} socket - Current socket
 * @param {string} command  - The command sent by the client
 * 
 * @returns 
 */
export const I_in_prog_data = (
    email: RecvEmail,
    socket: WrappedSocket,
    command: string
): void => {
    // -- Ensure that the DATA command was sent
    if (
        !email.has_marker('DATA') ||
        email.has_marker('DATA:DISALLOWED')
    ) {
        email.send_message(socket, 503);
        email.close(socket, false);
        return;
    }

    // -- Get the size of the data the user is sending
    const current_size = command.length,
        data_lines = command.split('\n');


    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    let allow_continue = true, bypass_size_check = false;
    extensions._get_command_extension_group('DATA').forEach((callback: IDataExtensionDataCallback) => {

        // -- Build the extension data
        const extension_data: IDATAExtensionData = {
            email, socket, log,
            words: [], raw_data: command,
            smtp: SMTP.get_instance(),
            type: 'DATA',
            current_size,
            data_lines,
            total_size: email.data_size,
            bypass_size_check: false,
            action: (action) => allow_continue = action === 'ALLOW'
        };



        // -- Run the callback
        try {
            callback(extension_data);
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
            delete extension_data.current_size;
            delete extension_data.bypass_size_check;
            delete extension_data.action;
        }
    });



    // -- Check if the extension allowed the data to be sent
    if (!allow_continue) {
        email.sending_data = false;
        email.send_message(socket, 552);
        email.close(socket, false);
        return;
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
            return;
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
            return;
        }

        // -- Add the data to the email
        email.push_data = line;
    }
}