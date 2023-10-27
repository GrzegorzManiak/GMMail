import { Socket as BunSocket } from 'bun';
import RecvEmail from '../../email/recv';
import SMTPIngress from './ingress';
import { CommandMap } from '../types';
import { log } from '../../log';
import DATA, { in_prog_data } from '../commands/DATA';
import EHLO from '../commands/EHLO';
import HELO from '../commands/HELO';
import HELP from '../commands/HELP';
import MAIL_FROM from '../commands/MAIL_FROM';
import QUIT from '../commands/QUIT';
import RCPT_TO from '../commands/RCPT_TO';
import VRFY from '../commands/VRFY';
import RSET from '../commands/RSET';
import { parse_custom_ingress_command } from '../commands/CUST_IN';
import NOOP from '../commands/NOOP';
import STARTLS from '../commands/STARTLS';





/**
 * @name add_commands
 * @description Adds the commands to the commands map
 * 
 * @param {CommandMap} commands_map - The commands map
 * 
 * @returns {void}
 */
export const add_commands = (
    commands_map: CommandMap
) => {
    log('DEBUG', 'SMTP', 'add_commands', 'Adding SMTP commands');

    // -- Add the commands
    DATA(commands_map);
    EHLO(commands_map);
    HELO(commands_map);
    HELP(commands_map);
    MAIL_FROM(commands_map);
    QUIT(commands_map);
    RCPT_TO(commands_map);
    VRFY(commands_map);
    RSET(commands_map);
    NOOP(commands_map);
    STARTLS(commands_map);

    log('DEBUG', 'SMTP', 'add_commands', 'SMTP commands added');
}



/**
 * @file process.ts
 * @description Processes the SMTP commands sent by the client
 * 
 * @param {Array<string>} commands - The command sent by the client
 * @param {RecvEmail} email - The email object that the client is connected to
 * @param {BunSocket<unknown>} socket - The socket that the client is connected to
 * @param {SMTPIngress} smtp_ingress - The SMTPIngress class
 * 
 * @returns {void}
 */
export const process = (
    command: string,
    email: RecvEmail,
    socket: BunSocket<unknown>,
    smtp_ingress: SMTPIngress
) => {
    const commands_map = smtp_ingress.map;
    email.locked = true;
    
    // -- Split the command into the words and at :
    const words = command
        .split(' ')
        .flatMap(word => word.trim().split(':'))
        .filter(word => word.length > 0);

    
    // -- Check if the client is sending data
    if (email.sending_data) 
        return in_prog_data(email, socket, command, words);


    // -- Check for potential commands that have two words
    //  TODO: CHANGE THIS SO IT WORKS LIKE NORMAL
    if (words.length > 1) switch (words[1].toUpperCase()) {
        case 'FROM':
            if (words[0].toUpperCase() === 'MAIL')
                return commands_map.get('MAIL FROM')(socket, email, words, command);
            break;

        case 'TO':
            if (words[0].toUpperCase() === 'RCPT')
                return commands_map.get('RCPT TO')(socket, email, words, command);
            break;
    }




    // -- Check for potential commands that have one word
    const command_name = words[0].toUpperCase();
    if (commands_map.has(command_name)) 
        return commands_map.get(command_name)(socket, email, words, command);
    

    // -- Parse any custom commands
    const progress = parse_custom_ingress_command(
        email, socket, command, words, command_name);
    if (progress === false) return;


    // -- If the command is not recognized, return an error
    email.send_message(socket, 500, words[0]);
    email.locked = false;
};