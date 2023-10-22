import RecvEmail from '../email/recv';
import ExtensionManager from '../extensions/main';
import { ICustomCommandData, ICustomParser, IParsedParser } from '../extensions/types';
import { log } from '../log';
import { Socket as BunSocket } from 'bun';
import SMTP from './smtp';
import CODE from './commands/CODE';
import parse_command from './parser';

const GOOD_CODES = [250, 251, 252];

export const parse_custom_ingress_command = (
    email: RecvEmail,
    socket: BunSocket<unknown>,
    command: string,
    words: Array<string>,
    command_name: string,
): boolean => {
    
    
    // -- Check for custom commands
    const em = ExtensionManager.get_instance();
    let command_found = false, other_messages: Array<string> = [], returned = false;
    em._is_custom_ingress_command(command_name).forEach((cce) => {

        // -- If we have already returned, return
        if (returned) return;
        command_found = true;
        log('DEBUG', 'SMTP', 'process', `Running custom ingress command '${command_name}'`);


        // -- Parse the command
        const parser_start = Bun.nanoseconds();
        const parsed = parse_command(command_name, command, cce.paramaters);
        const parser_end = Bun.nanoseconds();

        if ((parsed as unknown as any)?.length) {
            log('DEBUG', 'SMTP', 'process', `Custom ingress command '${command_name}' FAILED to parse`);
            returned = true;
            email.send_message(socket, parsed[0], parsed[1]);
            return false;
        }


        // -- Construct the CustomCommandExtensionData
        const extension_data: ICustomCommandData = {
            log: (type, ...args) => log(type, 'SMTP', 'process', ...args),
            email, socket, smtp: SMTP.get_instance(), raw_data: command, words, type: command_name,
            _returned: false,
            _parsed: false,
            _paramaters: cce.paramaters,
            parsed: parsed as IParsedParser,
            performance: {
                parser_end, parser_start,
                parser_time: parser_end - parser_start,
            }
        };


        
        // -- Run the callback
        const response = cce.callback(extension_data);
        if (!response) return;


        // -- Check the code
        if (
            !GOOD_CODES.includes(response) &&
            returned === false
        ) {
            email.send_message(socket, response);
            return false;
        }
    });



    // -- If the command was found, return
    if (command_found && returned === false) {
        log('DEBUG', 'SMTP', 'process', `Custom ingress command '${command_name}' NOT returned`);
        email.send_message(socket, 250);
        return false;
    }



    // -- If the command was found, return
    if (command_found || returned) {
        log('DEBUG', 'SMTP', 'process', `Custom ingress command '${command_name}' returned`);
        email.locked = false;
        return false;
    }
    

    // -- TRue as we have not sent a response
    return true;
}