import Configuration from '../../config';
import ExtensionManager from '../../extensions/main';
import { IExtensionData, IExtensionDataCallback, IStartTlsExtensionData, IStartTlsExtensionDataCallback } from '../../extensions/types';
import { log } from '../../log';
import SMTP from '../smtp';
import { CommandMap } from '../types';
import { Socket as BunSocket } from 'bun';
import {
    socket_data,
    socket_open,
    socket_close,
    socket_drain,
    socket_error,
} from '../sockets/socket';


const GOOD_CODES = [250, 251];



/**
 * @name STARTTLS
 * @description Processes the STARTTLS command which
 * upgrades the connection to TLS
 */
export default (commands_map: CommandMap) => 
    commands_map.set('STARTTLS', (socket, email, words, raw_data) => {

    
    // -- If we should not allow the upgrade, return an error
    let allow_upgrade = true;


    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    extensions._get_command_extension_group('STARTTLS').forEach((callback: IStartTlsExtensionDataCallback) => {



        // -- Construct the extension data
        const extension_data: IStartTlsExtensionData = {
            email, socket, log,
            words, raw_data,
            smtp: SMTP.get_instance(),
            type: 'STARTTLS',
            current_status: allow_upgrade ? 'ALLOW' : 'DENY',
            action: (action) => allow_upgrade = action === 'ALLOW'
        };


        
        // -- Run the callback
        try {
            log('DEBUG', 'SMTP', 'process', `Running STARTTLS extension '${callback.name}'`);
            callback(extension_data);
        }

        // -- If there was an error, log it
        catch (err) {
            log('ERROR', 'SMTP', 'process', `Error running STARTTLS extension '${callback.name}'`, err);
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


    // -- Upgrade the socket to TLS
    // @ts-ignore
    const tls_socket = socket.upgradeTLS({
        // .data on the newly created socket
        data: socket.data,
        tls: {
            key: Bun.file(config.get<string>('TLS', 'KEY')),
            cert: Bun.file(config.get<string>('TLS', 'CERT')),
        },

        socket: {
            data: (socket, data) => socket_data(socket, data, port),
            open: socket => socket_open(socket, port, 'TLS'),
            close: socket => socket_close(socket, port),
            drain: socket => socket_drain(socket, port),
            error: (socket, error) => socket_error(socket, error, port),
        }
    }) as BunSocket<unknown>;

    
});