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
export const I_NOOP = (commands_map: CommandMap) => 
    commands_map.set('NOOP', (socket, email, words, raw_data) => {


    // -- Build the extension data
    const extension_data: INoopExtensionData = {
        log, email, socket,
        words, raw_data,
        smtp: SMTP.get_instance(),
        type: 'NOOP',
    };


    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    extensions._get_command_extension_group('NOOP').forEach((callback: INoopExtensionDataCallback) => 
        callback(extension_data));


    // -- Push the quit message
    email.send_message(socket, 250);
});