import ExtensionManager from '../../extensions/main';
import { INoopExtensionData, INoopExtensionDataCallback } from '../../extensions/types';
import { log } from '../../log';
import SMTP from '../ingress/ingress';
import { CommandMap } from '../types';



/**
 * @name I_NOOP
 * @description Processes the NOOP command, Which 
 * dose a whole lot of nothing
 */
export const I_NOOP = (commands_map: CommandMap) => commands_map.set('NOOP', 
    (socket, email, words, raw_data) => new Promise(async(resolve, reject) => {



    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    const promises = [];
    extensions._get_command_extension_group('NOOP').forEach((data) =>  {
        // -- Build the extension data
        const extension_data: INoopExtensionData = {
            log, email, socket,
            words, raw_data,
            smtp: SMTP.get_instance(),
            type: 'NOOP',
            extension_id: data.id,
            extensions: extensions,
        };
        
        promises.push((data.callback as INoopExtensionDataCallback)(extension_data));
    });

    // -- Wait for all the promises to resolve
    await Promise.all(promises);


    // -- Push the quit message
    email.send_message(socket, 250);
    return resolve();
}));