import RecvEmail from '../../email/recv';
import ExtensionManager from '../../extensions/main';
import { IVRFYExtensionData, IVrfyExtensionDataCallback } from '../../extensions/types';
import { log } from '../../log';
import SMTP from '../smtp';
import { CommandMap, IVRFYResponse, VRFYResponseCode } from '../types';



/**
 * @name VRFY
 * @description Processes the VRFY command
 * by default, returns 252, but can be overriden
 * trough extensions
 */
export default (commands_map: CommandMap) => commands_map.set('VRFY', 
    (socket, email, words, raw_data) => {



    // -- Array to store the already found users
    const found_users: Array<IVRFYResponse> = [];



    // -- Construct the extension data and call the callbacks
    const extensions = ExtensionManager.get_instance();
    extensions._get_command_extension_group('VRFY').forEach((callback: IVrfyExtensionDataCallback) => {

        // -- Action function
        const action = (data: IVRFYResponse | Array<IVRFYResponse>) => {
            
            // -- Ensure the data is an array
            if (!Array.isArray(data)) data = [data];

            // -- Push the data to the found users
            for (let i = 0, l = data.length; i < l; i++) {
                const entry = data[i];

                // -- Attempt to verify that the data is valid
                const email_valid = RecvEmail.validate_address(entry.address),
                    username_valid = RecvEmail.validate_username(entry.username);

                // -- If the email or username is invalid, log it and continue
                if (!email_valid || !username_valid) {
                    log('ERROR', 'SMTP', 'process', `Invalid VRFY response from extension '${callback.name}'`, entry);
                    continue;
                }

                // -- Push the entry to the found users
                found_users.push(entry);
            }
        };



        // -- Build the extension data object
        const extension_data: IVRFYExtensionData = {
            email, socket, log,
            words, raw_data,
            smtp: SMTP.get_instance(),
            type: 'VRFY',
            found_users,
            action,
        };


        
        // -- Run the callback
        try {
            log('DEBUG', 'SMTP', 'process', `Running VRFY extension '${callback.name}'`);
            callback(extension_data);
        }

        // -- If there was an error, log it
        catch (err) {
            log('ERROR', 'SMTP', 'process', `Error running VRFY extension '${callback.name}'`, err);
        }
    });

   

    // -- If there was no users found, return a 252
    if (found_users.length < 1) return
        email.send_message(socket, 252);

        

    // -- Else process the users for sending
    for (
        let i = 0, l = found_users.length;
        i < l;
        i++
    ) {
        // -- Construct the message (If the username is not found, don't include it)
        const message = `${found_users[i]?.username ? `${found_users[i].username} ` : ''}<${found_users[i].address}>`;

        if (i === l - 1) email.send_message(socket, 2504, message); // -- 2504 is the code for the last line of a multi-line response
        else email.send_message(socket, 2503, message); // -- 2503 is the code for a multi-line response
    }
});