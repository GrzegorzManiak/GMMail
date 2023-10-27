import ExtensionManager from '../../extensions/main';
import { IQuitExtensionData, IQuitExtensionDataCallback } from '../../extensions/types';
import { log } from '../../log';
import SMTP from '../ingress/ingress';
import { CommandMap } from '../types';



/**
 * @name QUIT
 * @description Processes the QUIT command
 * QUIT
 */
export default (commands_map: CommandMap) => 
    commands_map.set('QUIT', (socket, email, words, raw_data) => {


    // -- Build the extension data
    const extension_data: IQuitExtensionData = {
        log, email, socket,
        words, raw_data,
        smtp: SMTP.get_instance(),
        type: 'QUIT',
    };


    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    extensions._get_command_extension_group('QUIT').forEach((callback: IQuitExtensionDataCallback) => 
        callback(extension_data));


    // -- Push the quit message
    email.send_message(socket, 221, 'Bye');
});