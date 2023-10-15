import { Socket as BunSocket } from 'bun';
import Email from '../email/email';
import CODE from './messages/CODE';
import SMTP from './smtp';
import HELO_EHLO from './messages/HELO_EHLO';
import { log } from '../log';
import EHLO from './messages/EHLO';
import HELP from './messages/HELP';
import ExtensionManager from '../extensions/main';
import { IVRFYExtensionData } from '../extensions/types';
import { IVRFYResponse } from './types';



/**
 * @name commands_map
 * @description Maps the commands to their respective functions
 */
const commands_map = new Map<string, (
    socket: BunSocket<any>, 
    email: Email,
    words: Array<string>,
    raw: string,
) => void>();



/**
 * @file process.ts
 * @description Processes the SMTP commands sent by the client
 * 
 * @param {Array<string>} commands - The command sent by the client
 * @param {Email} email - The email object that the client is connected to
 * @param {BunSocket<any>} socket - The socket that the client is connected to
 * 
 * @returns {void}
 */
export default (
    commands: Array<string>,
    email: Email,
    socket: BunSocket<any>,
) => commands.forEach(command => {
    email.locked = true;

    // -- Check if the client is sending data
    if (email.sending_data) {
        // -- Add the data to the email 
        email.push_data = command;
        if (command !== SMTP.get_instance().crlf) return;

        // -- Inform the client that the data was received
        email.sending_data = false;
        const message = CODE(250);
        email.push_message('send', message);
        socket.write(message);
        return;
    }


    
    // -- Split the command into the words and at :
    const words = command
        .split(' ')
        .flatMap(word => word.trim().split(':'))
        .filter(word => word.length > 0);


    // -- Check for potential commands that have two words
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
    


    // -- If the command is not recognized, return an error
    const message = CODE(500, words[0]);
    email.push_message('send', message);
    socket.write(message);
    email.locked = false;
});



/**
 * @name EHLO
 * @description Processes the EHLO command
 * Returns the list of supported features
 * and the server greeting
 */
commands_map.set('EHLO', (socket, email, words) => {
    // -- ensure that we are in the INIT stage
    if (email.has_marker('EHLO') || email.has_marker('HELO')) {
        const error = CODE(503, 'Bad sequence of commands');
        email.push_message('send', error);
        email.close(false);
        socket.write(error);
        return;
    }



    // - Parse the HELO/EHLO
    const he = HELO_EHLO(words.join(' '));
    if (he.message_type === 'UNKNOWN') {
        const unknown = CODE(500, 'Unknown command');
        email.push_message('send', unknown);
        email.close(false);
        socket.write(unknown);
    }


    // -- Push the greeting
    const greetings = CODE(2501);
    email.push_message('send', greetings);
    socket.write(greetings);



    // -- Only write the supported features if the command was EHLO
    const features = EHLO();
    features.forEach(feature => {
        email.push_message('send', feature);
        socket.write(feature);
    });


    // -- Set the stage and unlock the email
    email.marker = 'EHLO';
    email.from_domain = he.sender_domain;
    email.mode = 'EHLO';
    email.locked = false;
});



/**
 * @name HELO
 * @description Processes the HELO command
 * Older, less useful version of EHLO, sends
 * only the server greeting
 */
commands_map.set('HELO', (socket, email, words) => {
    // -- ensure that we are in the INIT stage
    if (email.has_marker('HELO')) {
        const error = CODE(503, 'Bad sequence of commands');
        email.push_message('send', error);
        email.close(false);
        socket.write(error);
        return;
    }



    // - Parse the HELO/EHLO
    const he = HELO_EHLO(words.join(' '));
    if (he.message_type === 'UNKNOWN') {
        const unknown = CODE(500, 'Unknown command');
        email.push_message('send', unknown);
        email.close(false);
        socket.write(unknown);
    }



    // -- Push the greeting
    const greetings = CODE(2501);
    email.push_message('send', greetings);
    socket.write(greetings);



    // -- Set the stage and unlock the email
    email.marker = 'HELO';
    email.from_domain = he.sender_domain;
    email.mode = 'HELO';
    email.locked = false;
});



/**
 * @name MAIL FROM
 * @description Processes the MAIL FROM command
 * MAIL FROM: < ... >
 */
commands_map.set('MAIL FROM', (socket, email, _, command) => {
    // -- ensure that we are in the VALIDATE stage
    if (email.has_marker('MAIL FROM')) {
        const error = CODE(503, 'Bad sequence of commands');
        email.push_message('send', error);
        email.close(false);
        socket.write(error);
        return;
    }


    // -- Parse the MAIL FROM
    const valid = email.process_sender(command);
    if (!valid) {
        const invalid = CODE(553, 'FROM address invalid');
        email.push_message('send', invalid);
        email.close(false);
        socket.write(invalid);
        socket.end();
        return;
    }


    // -- Unlock the email
    const message = CODE(250);
    email.push_message('send', message);
    email.marker = 'MAIL FROM';
    socket.write(message);
    email.locked = false;
});



/**
 * @name RCPT TO
 * @description Processes the RCPT TO command
 * RCPT TO: < ... >
 */
commands_map.set('RCPT TO', (socket, email, _, command) => {
    // -- We can have alot of RCPT TO commands, so we don't need 
    //    to ensure that we only received one command


    // -- Parse the MAIL FROM
    const valid = email.process_recipient(command);
    if (!valid) {
        const invalid = CODE(553, 'FROM address invalid');
        email.push_message('send', invalid);
        email.close(false);
        socket.write(invalid);
        socket.end();
        return;
    }
    


    // -- Unlock the email
    const message = CODE(250);
    email.push_message('send', message);
    email.marker = 'MAIL FROM';
    socket.write(message);
    email.locked = false;
});



/**
 * @name DATA
 * @description Processes the DATA command
 * DATA ... CRLF . CRLF
 */
commands_map.set('DATA', (socket, email) => {

    // -- Push the data message
    const message = CODE(354);
    email.push_message('send', message);
    email.sending_data = true;
    socket.write(message);
    email.locked = false;
});



/**
 * @name QUIT
 * @description Processes the QUIT command
 * QUIT
 */
commands_map.set('QUIT', (socket, email) => {
    // -- Push the quit message
    const message = CODE(221);
    email.push_message('send', message);
    email.close(true);
    socket.write(message);
    socket.end();

    log('DEBUG', 'SMTP', 'QUIT', `Email ${email.id} closed`);
    email.data.forEach(line => console.log(line));
});



/**
 * @name HELP
 * @description Processes the HELP command
 * HELP, Returns the list of supported commands
 */
commands_map.set('HELP', (socket, email) => {
    // -- Push the help message
    const message = HELP();
    message.forEach(line => {
        email.push_message('send', line);
        socket.write(line);
    });
    email.locked = false;
});



/**
 * @name VRFY
 * @description Processes the VRFY command
 * by default, returns 252, but can be overriden
 * trough extensions
 */
commands_map.set('VRFY', (socket, email, words, raw_data) => {

    // -- Codes that indicate success
    const GOOD_CODES = [250, 251, 252];
    let code_250_messages = [];
    let other_messages = [];

    // -- Build the extension data
    const extension_data: IVRFYExtensionData = {
        email, socket, log,
        words, raw_data,
        smtp: SMTP.get_instance(),
        type: 'VRFY',
        _returned: false,
        response(data) {

            // -- If the data is not valid, return an error
            if (!GOOD_CODES.includes(data.code)) {
                const message = CODE(data.code);
                email.push_message('send', message);
                other_messages.push(message);
                socket.write(message);
                return;
            }

            
            // -- Code has to be 250 to send the user
            if (data.code !== 250) {
                const message = CODE(data.code);
                email.push_message('send', message);
                other_messages.push(message);
                socket.write(message);
                return;
            }


            // -- Construct the message
            const user_name = data.username,
                address = data.address;

            // -- Check if the user name and email address are valid
            if (!user_name || !address) {
                const message = CODE(550);
                email.push_message('send', message);
                other_messages.push(message);
                socket.write(message);
                return;
            }

            
            // -- Construct the message
            let message = '';
            if (user_name) message += ` ${user_name} `;
            message += `<${address}>`;

            // -- Push the message
            code_250_messages.push(message);
            extension_data._returned = true;
        },
    };



    // -- Get the extensions
    const extensions = ExtensionManager.get_instance();
    extensions._get_command_extension_group('VRFY').forEach((callback) => {

        // -- If other messages were sent, don't run the callback
        //    as only one non 250 message can be sent
        if (other_messages.length > 0) return;
        
        // -- Run the callback
        const response = callback(extension_data);
        if (!response) return;

        // -- Check the code
        if (
            !GOOD_CODES.includes(response) &&
            extension_data._returned === false
        ) {
            const message = CODE(response);
            email.push_message('send', message);
            other_messages.push(message);
            socket.write(message);
            return;
        }
    });


    // -- Send all the 250 messages if no other messages were sent
    if (
        code_250_messages.length > 0 && 
        other_messages.length === 0
    ) {
        
        // -- 250-<message> bar the last one
        let constructed_message = '';
        code_250_messages.forEach((message, index) => {
            
            // -- Check if this is the last message
            if (index === code_250_messages.length - 1) {
                constructed_message += ` ${message}\r\n`;
                return;
            }
            
            // - Else, add the message and a new line
            constructed_message += ` ${message}\r\n`;
        });

        
        // -- Push the message
        email.push_message('send', constructed_message);
        socket.write(constructed_message);
        return;
    }


    // -- If there were no messages sent, send the default 252
    if (other_messages.length !== 0) return;


    // -- Push the help message
    const message = CODE(252);
    email.push_message('send', message);
    socket.write(message);
    email.locked = false;
});