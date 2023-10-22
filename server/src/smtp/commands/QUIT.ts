import ExtensionManager from '../../extensions/main';
import { IExtensionData, IExtensionDataCallback } from '../../extensions/types';
import { log } from '../../log';
import SMTP from '../smtp';
import { CommandMap } from '../types';
import CODE from './CODE';



/**
 * @name QUIT
 * @description Processes the QUIT command
 * QUIT
 */
export default (commands_map: CommandMap) => 
    commands_map.set('QUIT', (socket, email, words, raw_data) => {


    // -- Build the extension data
    const extension_data: IExtensionData = {
        log, email, socket,
        words, raw_data,
        smtp: SMTP.get_instance(),
        type: 'QUIT',
    };


    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    extensions._get_command_extension_group('QUIT').forEach((callback: IExtensionDataCallback) => 
        callback(extension_data));


    // -- Push the quit message
    email.send_message(socket, 221, 'Bye');
});