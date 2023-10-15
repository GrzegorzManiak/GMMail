import { Socket as BunSocket } from 'bun';
import Email from '../email/email';
import CODE from './messages/CODE';
import SMTP from './smtp';
import HELO_EHLO from './messages/HELO_EHLO';
import { log } from 'console';
import EHLO from './messages/EHLO';
import HELP from './messages/HELP';



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