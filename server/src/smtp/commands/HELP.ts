import Configuration from '../../config';
import SMTP from '../smtp';
import { CommandMap } from '../types';



/**
 * @name HELP
 * @description Processes the HELP command
 * HELP, Returns the list of supported commands
 */
export default (commands_map: CommandMap) => commands_map.set('HELP', (socket, email) => {
    // -- Push the help message
    const config = Configuration.get_instance(),
        vendor = config.get<string>('VENDOR');

    // -- Construct the message
    const message = `213-The following commands are recognized by ${vendor}\r\n`,
        commands = SMTP.get_instance().supported_commands

    // -- Add the commands to the message
    commands.push(message);
    commands.map(feature => '213-' + feature.toUpperCase() + '\r\n');
    commands.push('250 HELP\r\n');

    // -- Send the message
    commands.forEach(line => {
        email.push_message('send', line);
        socket.write(line);
    });
    email.locked = false;
});