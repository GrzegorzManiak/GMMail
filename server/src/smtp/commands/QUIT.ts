import { log } from '../../log';
import { CommandMap } from '../types';
import CODE from './CODE';



/**
 * @name QUIT
 * @description Processes the QUIT command
 * QUIT
 */
export default (commands_map: CommandMap) => 
    commands_map.set('QUIT', (socket, email) => {

    // -- Push the quit message
    const message = CODE(221);
    email.push_message('send', message);
    email.close(true);
    socket.write(message);
    socket.end();

    log('DEBUG', 'SMTP', 'QUIT', `Email ${email.id} closed`);
});