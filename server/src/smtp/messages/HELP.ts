import Configuration from '../../config';
import SMTP from '../smtp';

export default (
): Array<string> => {
    const config = Configuration.get_instance(),
        host = config.get<string>('HOST'),
        vendor = config.get<string>('VENDOR'),
        date = new Date();

    // -- Construct the message
    let message = `213-The following commands are recognized by ${vendor}\r\n`;
    const commands = SMTP.get_instance()
        .supported_commands.map(feature => '213-' + feature.toUpperCase() + '\r\n');
    commands.push('250 HELP\r\n');

    // -- Return the valid commands
    return commands;
};  