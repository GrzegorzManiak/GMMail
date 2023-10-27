import Configuration from '../../config';
import SMTP from '../ingress/ingress';
import { CommandMap } from '../types';



/**
 * @name HELP
 * @description Processes the HELP command
 * HELP, Returns the list of supported commands
 */
export default (commands_map: CommandMap) => commands_map.set('HELP', (socket, email) => {

    // -- Push the greeting
    email.send_message(socket, 213);
    email.locked = true;

    // -- Get the supported features
    const smtp = SMTP.get_instance(),
        features = smtp.supported_features;

    // -- Send the features
    features.forEach(feature => {
        email.send_message(socket, 2503, feature);
        email.locked = true;
    });

    // -- Send the help message
    email.marker = 'HELP';
    email.send_message(socket, 2504, 'HELP');
});