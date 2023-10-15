import ExtensionManager from '../../extensions/main';
import { IVRFYExtensionData, IVRFYExtensionDataCallback } from '../../extensions/types';
import { log } from '../../log';
import SMTP from '../smtp';
import { CommandMap } from '../types';
import CODE from './CODE';



/**
 * @name VRFY
 * @description Processes the VRFY command
 * by default, returns 252, but can be overriden
 * trough extensions
 */
export default (commands_map: CommandMap) => commands_map.set('VRFY', 
    (socket, email, words, raw_data) => {

    // -- Codes that indicate success
    const GOOD_CODES = [250, 251, 252];
    let code_250_messages = [];
    let other_messages = [];

    // -- Build the extension data
    const extension_data: IVRFYExtensionData = {
        email, socket, log,
        words, raw_data,
        smtp: SMTP.get_instance(),
        type: 'VRFY',
        _returned: false,
        response(data) {

            // -- If the data is not valid, return an error
            if (!GOOD_CODES.includes(data.code)) {
                const message = CODE(data.code);
                email.push_message('send', message);
                other_messages.push(message);
                socket.write(message);
                return;
            }

            
            // -- Code has to be 250 to send the user
            if (data.code !== 250) {
                const message = CODE(data.code);
                email.push_message('send', message);
                other_messages.push(message);
                socket.write(message);
                return;
            }


            // -- Construct the message
            const user_name = data.username,
                address = data.address;

            // -- Check if the user name and email address are valid
            if (!user_name || !address) {
                const message = CODE(550);
                email.push_message('send', message);
                other_messages.push(message);
                socket.write(message);
                return;
            }

            
            // -- Construct the message
            let message = '';
            if (user_name) message += ` ${user_name} `;
            message += `<${address}>`;

            // -- Push the message
            code_250_messages.push(message);
            extension_data._returned = true;
        },
    };



    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    extensions._get_command_extension_group('VRFY').forEach((callback: IVRFYExtensionDataCallback) => {

        // -- If other messages were sent, don't run the callback
        //    as only one non 250 message can be sent
        if (other_messages.length > 0) return;
        
        // -- Run the callback
        const response = callback(extension_data);
        if (!response) return;

        // -- Check the code
        if (
            !GOOD_CODES.includes(response) &&
            extension_data._returned === false
        ) {
            const message = CODE(response);
            email.push_message('send', message);
            other_messages.push(message);
            socket.write(message);
            return;
        }
    });


    // -- Send all the 250 messages if no other messages were sent
    if (
        code_250_messages.length > 0 && 
        other_messages.length === 0
    ) {
        
        // -- 250-<message> bar the last one
        let constructed_message = '';
        code_250_messages.forEach((message, index) => {
            
            // -- Check if this is the last message
            if (index === code_250_messages.length - 1) {
                constructed_message += ` ${message}\r\n`;
                return;
            }
            
            // - Else, add the message and a new line
            constructed_message += ` ${message}\r\n`;
        });


        // -- Push the message
        email.push_message('send', constructed_message);
        socket.write(constructed_message);
        return;
    }


    // -- If there were no messages sent, send the default 252
    if (other_messages.length !== 0) return;


    // -- Push the help message
    const message = CODE(252);
    email.push_message('send', message);
    socket.write(message);
    email.locked = false;
});