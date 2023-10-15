import CODE from './CODE';
import SMTP from '../smtp';
import { log } from '../../log';
import ExtensionManager from '../../extensions/main';
import { IDATAExtensionData, IDataExtensionDataCallback } from '../../extensions/types';
import { CommandMap } from '../types';
import RecvEmail from '../../email/recv';
import { Socket as BunSocket } from 'bun';
import Configuration from '../../config';



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
        !email.has_marker('MAIL FROM') ||
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
    };



    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    extensions._get_command_extension_group('DATA').forEach((callback: IDataExtensionDataCallback) => {

        // -- If other messages were sent, don't run the callback
        //    as only one non 250 message can be sent
        if (extension_data._returned === true) return;

        // -- Run the callback
        const response = callback(extension_data);
        if (!response) return;

        // -- Check the code
        if (!(response === 250 || response === void 0)) {
            extension_data._returned = true;
            const message = CODE(response);
            email.push_message('send', message);
            socket.write(message);
            return;
        }
    });



    // -- Push the data message
    const message = CODE(354);
    email.marker = 'DATA';
    email.push_message('send', message);
    email.sending_data = true;
    socket.write(message);
    email.locked = false;
});



/**
 * @name in_prog_data
 * @description Processes the data sent by the client
 * different from the DATA command as this is the data 
 * sent by the client
 * 
 * @param {RecvEmail} email - Current email object
 * @param {BunSocket<any>} socket - Current socket
 * @param {string} command  - The command sent by the client
 * @returns 
 */
export const in_prog_data = (
    email: RecvEmail,
    socket: BunSocket<any>,
    command: string,
): void => {
    // -- Ensure that the DATA command was sent
    if (!email.has_marker('DATA')) {
        const error = CODE(503);
        email.push_message('send', error);
        email.close(false);
        socket.write(error);
        return;
    }

    // -- Get the size of the data the user is sending
    const current_size = command.length;



    // -- Construct the extension data object
    const extension_data: IDATAExtensionData = {
        email, socket, log,
        words: [], raw_data: command,
        smtp: SMTP.get_instance(),
        type: 'DATA',
        total_size: email.data_size,
        current_size,
        bypass_size_check: false,
        _returned: false,
    };



    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    extensions._get_command_extension_group('DATA').forEach((callback: IDataExtensionDataCallback) => {
        
        // -- If other messages were sent, don't run the callback
        //    as only one non 250 message can be sent
        if (extension_data._returned === true) return;

        // -- Run the callback
        const response = callback(extension_data);
        if (!response) return;

        // -- Check the code
        if (!(response === 250 || response === void 0)) {
            extension_data._returned = true;
            email.sending_data = false;
            const message = CODE(response);
            email.push_message('send', message);
            socket.write(message);
            return;
        }
    });



    // -- Ensure that the data size is not exceeded
    if (!extension_data.bypass_size_check) {
        const config = Configuration.get_instance(),
            max_size = config.get<number>('MAIL', 'MAX_SIZE');
            
        // -- Check if the size is exceeded
        if (current_size + email.data_size > max_size) {
            email.sending_data = false;
            const message = CODE(552);
            email.push_message('send', message);
            socket.write(message);
            return;
        }
    }


    // -- Add the data to the email 
    email.push_data = command;
    
    // -- Check if this is the end of the data
    if (command !== SMTP.get_instance().crlf) return;


    // -- Inform the client that the data was received
    email.sending_data = false;
    const message = CODE(250);
    email.push_message('send', message);
    socket.write(message);
    return;
}