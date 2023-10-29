import ExtensionManager from '../../extensions/main';
import { IQuitExtensionData, IQuitExtensionDataCallback } from '../../extensions/types';
import { log } from '../../log';
import SMTP from '../ingress/ingress';
import { CommandMap } from '../types';



/**
 * @name I_QUIT
 * @description Processes the QUIT command
 * QUIT
 */
export const I_QUIT = (commands_map: CommandMap) => commands_map.set('QUIT', 
    (socket, email, words, raw_data) => new Promise(async(resolve, reject) => {


    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    const promises = [];
    extensions._get_command_extension_group('QUIT').forEach((data) =>  {
        // -- Build the extension data
        const extension_data: IQuitExtensionData = {
            log, email, socket,
            words, raw_data,
            smtp: SMTP.get_instance(),
            type: 'QUIT',
            extension_id: data.id,
            extensions: extensions,
        };
        
        promises.push((data.callback as IQuitExtensionDataCallback)(extension_data));
    });

    // -- Wait for all the promises to resolve
    await Promise.all(promises);


    // -- Push the quit message
    email.send_message(socket, 221, 'Bye');
    return resolve();
}));