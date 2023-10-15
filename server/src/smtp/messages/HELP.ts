import Configuration from '../../config';
import SMTP from '../smtp';

export default (
): Array<string> => {
    const config = Configuration.get_instance(),
        vendor = config.get<string>('VENDOR');

    // -- Construct the message
    const message = `213-The following commands are recognized by ${vendor}\r\n`,
        commands = SMTP.get_instance().supported_commands

    // -- Add the commands to the message
    commands.push(message);
    commands.map(feature => '213-' + feature.toUpperCase() + '\r\n');
    commands.push('250 HELP\r\n');

    // -- Return the valid commands
    return commands;
};  