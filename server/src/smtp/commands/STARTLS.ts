import Configuration from '../../config';
import ExtensionManager from '../../extensions/main';
import { IExtensionData, IExtensionDataCallback, IStartTlsExtensionData, IStartTlsExtensionDataCallback } from '../../extensions/types';
import { log } from '../../log';
import SMTP from '../ingress/ingress';
import { CommandMap } from '../types';
import { Socket as BunSocket } from 'bun';



const GOOD_CODES = [250, 251];



/**
 * @name STARTTLS
 * @description Processes the STARTTLS command which
 * upgrades the connection to TLS
 */
export default (commands_map: CommandMap) => 
    commands_map.set('STARTTLS', (socket, email, words, raw_data) => {

    
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
    email.upgrade_socket_mode();


    // -- Get the port
    const config = Configuration.get_instance(),
        port = socket.localPort;
        email.send_message(socket, 220);


    // // -- Upgrade the socket to TLS
    // // @ts-ignore
    // const tls_socket = socket.upgradeTLS({
    //     // .data on the newly created socket
    //     data: socket.data,
    //     tls: {
    //         key: Bun.file(config.get<string>('TLS', 'KEY')),
    //         cert: Bun.file(config.get<string>('TLS', 'CERT')),
    //     },

    //     socket: {
    //         data: (socket, data) => socket_data(socket, data, port),
    //         open: socket => socket_open(socket, port, 'TLS'),
    //         close: socket => socket_close(socket, port),
    //         drain: socket => socket_drain(socket, port),
    //         error: (socket, error) => socket_error(socket, error, port),
    //     }
    // }) as BunSocket<unknown>;

    
});