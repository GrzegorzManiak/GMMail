import ExtensionManager from '../../extensions/main';
import { IStartTlsExtensionData, IStartTlsExtensionDataCallback } from '../../extensions/types';
import { log } from '../../log';
import SMTP from '../ingress/ingress';
import { CommandMap } from '../types';

import { _runtime } from '../../main';
import NodeUpgradeSocket from '../ingress/sockets/node/upgrade';
import BunUpgradeSocket from '../ingress/sockets/bun/upgrade';



/**
 * @name I_STARTTLS
 * @description Processes the STARTTLS command which
 * upgrades the connection to TLS
 */
export const I_STARTTLS = (commands_map: CommandMap) => commands_map.set('STARTTLS',
    (socket, email, words, raw_data, configuration) => new Promise(async(resolve, reject) => {

    // -- Ensure that the current mode is NIL
    if (
        !(email.socket_mode === 'STARTTLS' || email.socket_mode === 'PLAIN') 
    ) {
        email.send_message(socket, 454); 
        return reject();
    }
        
    
    // -- If we should not allow the upgrade, return an error
    let allow_upgrade = true, final = false;


    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    const extension_funcs = extensions._get_command_extension_group('STARTTLS');
    for (let i = 0; i < extension_funcs.length; i++) {

        // -- Check if the final callback has been called
        if (final) break;


        // -- Construct the extension data
        const extension_data: IStartTlsExtensionData = {
            email, socket, log,
            words, raw_data,
            smtp: SMTP.get_instance(),
            type: 'STARTTLS',
            extension_id: extension_funcs[i].id,
            extensions: extensions,
            configuration,
            current_status: allow_upgrade ? 'ALLOW' : 'DENY',
            action: (action) => {
                allow_upgrade = (action === 'ALLOW' || action === 'ALLOW:FINAL');
                if (action === 'ALLOW:FINAL' || action === 'DENY:FINAL') final = true;
            }
        };


        
        // -- Run the callback
        try {
            log('DEBUG', 'SMTP', 'process', `Running STARTTLS extension`);
            const extension_func = extension_funcs[i].callback as IStartTlsExtensionDataCallback;
            await extension_func(extension_data);
        }

        // -- If there was an error, log it
        catch (err) {
            log('ERROR', 'SMTP', 'process', `Error running STARTTLS extension`, err);
        }

        // -- Finally, delete the extension data
        finally {
            delete extension_data.log;
            delete extension_data.words;
            delete extension_data.raw_data;
            delete extension_data.type;
            delete extension_data.current_status;
            delete extension_data.action;
        }
    }



    // -- If the extension disallowed the upgrade, return an error
    if (!allow_upgrade) {
        log('WARN', 'STARTTLS was not allowed by an extension');
        email.marker = 'STARTTLS';
        email.send_message(socket, 454);
        return resolve();
    }


    // -- Throw a 220, Proceed with TLS
    log('INFO', 'Upgrading connection to TLS');

    // -- Upgrade the socket
    email.upgrade_socket_mode();
    email.send_message(socket, 2201);
    email.reset_command();
    email.marker = 'STARTTLS';
    
    switch (_runtime) {
        case 'BUN': new BunUpgradeSocket(socket); break;
        case 'NODE': new NodeUpgradeSocket(socket); break;
    }
    
    return resolve();
}));