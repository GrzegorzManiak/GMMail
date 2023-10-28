import Configuration from '../../config';
import ExtensionManager from '../../extensions/main';
import { IExtensionData, IExtensionDataCallback, IStartTlsExtensionData, IStartTlsExtensionDataCallback } from '../../extensions/types';
import { log } from '../../log';
import SMTP from '../ingress/ingress';
import UpgradeSocket from '../ingress/sockets/upgrade';
import { CommandMap } from '../types';



/**
 * @name I_STARTTLS
 * @description Processes the STARTTLS command which
 * upgrades the connection to TLS
 */
export const I_STARTTLS = (commands_map: CommandMap) => 
    commands_map.set('STARTTLS', (socket, email, words, raw_data) => {

    // -- Ensure that the current mode is NIL
    if (email.socket_mode !== 'NIL') 
        return email.send_message(socket, 454); 
    
    // -- If we should not allow the upgrade, return an error
    let allow_upgrade = true, final = false;


    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    extensions._get_command_extension_group('STARTTLS').forEach((callback: IStartTlsExtensionDataCallback) => {

        // -- Check if the final callback has been called
        if (final) return;


        // -- Construct the extension data
        const extension_data: IStartTlsExtensionData = {
            email, socket, log,
            words, raw_data,
            smtp: SMTP.get_instance(),
            type: 'STARTTLS',
            current_status: allow_upgrade ? 'ALLOW' : 'DENY',
            action: (action) => {
                allow_upgrade = (action === 'ALLOW' || action === 'ALLOW:FINAL');
                if (action === 'ALLOW:FINAL' || action === 'DENY:FINAL') final = true;
            }
        };


        
        // -- Run the callback
        try {
            log('DEBUG', 'SMTP', 'process', `Running STARTTLS extension`);
            callback(extension_data);
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
    });



    // -- If the extension disallowed the upgrade, return an error
    if (!allow_upgrade) {
        log('WARN', 'STARTTLS was not allowed by an extension');
        email.marker = 'STARTTLS';
        email.send_message(socket, 454);
        return;
    }


    // -- Throw a 220, Proceed with TLS
    log('INFO', 'Upgrading connection to TLS');

    // -- Upgrade the socket
    email.upgrade_socket_mode();
    email.send_message(socket, 2201);
    email.reset_command();
    email.marker = 'STARTTLS';
    new UpgradeSocket(socket);
});