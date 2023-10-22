import Configuration from './config';
import SMTP from './smtp/smtp';
import ExtensionManager from './extensions/main';
import { log } from './log';
import { 
    ICustomCommandDataCallback,
    IDataExtensionDataCallback, 
    IExtensionDataCallback, 
    IMailFromExtensionDataCallback, 
    IRcptToExtensionDataCallback, 
    IVrfyExtensionDataCallback 
} from './extensions/types';


log('INFO', 'Main', 'main', 'Starting server...');
const config = Configuration.get_instance(import.meta.dir + '/../basic_config.json');

//  https://mailtrap.io/blog/smtp-commands-and-responses/#RSET

(async () => {

    // -- Await the configuration file
    await config.await_config();
    log('INFO', 'Main', 'main', 'Server started');


    // -- Load the SMTP server
    const smtp = SMTP.get_instance(),
        extensions = ExtensionManager.get_instance();



    /**
     * @name VRFY
     * Adds a step to the VRFY command to allow the user
     * to set custom VRFY responses / rules
     */
    extensions.add_command_extension<IVrfyExtensionDataCallback>('VRFY', (data) => {

        // -- Custom response after you maybe looked up the user in a database
        //    or a catchall, unknownthing you want
        data.response({
            code: 250,
            username: 'Test',
            address: 'test@test.com',
        });
        

        // -- Or just a positive response code and itll catch all
        // return 252 // -- Cannot VRFY user, but will accept message and attempt delivery
        // return 550 // -- Requested action not taken: mailbox unavailable
    });



    /**
     * @name DATA
     * Adds a step to the DATA command to allow the user
     * to controll the DATA command, eg bypass limits
     * or add custom checks
     */
    extensions.add_command_extension<IDataExtensionDataCallback>('DATA', (data) => {
        data.bypass_size_check = false;
        if (data.total_size > 1300) return 552;
        return 250
    });



    /**
     * @name QUIT
     * QUIT Listener, cant do much here bar maybe some custom desctruction
     * logic
     */
    extensions.add_command_extension<IExtensionDataCallback>('QUIT', (data) => {
        log('INFO', 'Main', 'main', 'Client disconnected');
    });



    /**
     * @name RSET
     * RSET Listener, cant do much here bar maybe some custom desctruction
     * logic or logging
     */
    extensions.add_command_extension<IExtensionDataCallback>('RSET', (data) => {
        log('INFO', 'Main', 'main', 'Client reset');
    });



    /**
     * @name RCPT TO
     * Custom RCPT TO listener, allows you to add custom checks eg, if you dont
     * want to pass CC'd users to the email, you can deny them here
     * 
     * or you can use it for logging, spam prevention, etc
     */
    extensions.add_command_extension<IRcptToExtensionDataCallback>('RCPT TO', (data) => {
        if (data.recipient.local === 'cc_email3') data.action('DENY');
    });



    /**
     * @name MAIL FROM
     * Custom RCPT TO listener, allows you to add custom checks eg, if you dont
     * want to pass CC'd users to the email, you can deny them here
     * 
     * or you can use it for logging, spam prevention, etc
     */
    extensions.add_command_extension<IMailFromExtensionDataCallback>('MAIL FROM', (data) => {
        if (data.sender.domain === 'example2.com') return 541;
        // -- You can return a 250, but thats the default
        return 250;
    });





    /**
     * @name CUSTOM INGRESS
     * Custom ingress commands allow you to define your own commands such as
     * HELO, EHLO, etc (Note, those are actually not custom commands, they are 
     * hard coded as its more performant) but you get the idea.
     * 
     * Eg, You could have a master / slave server that has a custom command that 
     * allows you to specify custom forwarding rules, or you could have a custom
     * command that allows you to specify a custom message to be sent to the Master
     * eg sending a fully formatted email to the master server (Not our target), 
     * but attaching a custom 'FORWARD_TO' header that tells the server to forward 
     * the email to a different address with a key that only the master server knows
     */
    extensions.add_custom_ingress_command<ICustomCommandDataCallback>('CUSTOM', {
        parser: {
            SERVER_NAME: 'phrase:REQUIRED', // -- A sentance, eg "My Server", has whitespace
            TEST: 'string:REQUIRED',        // -- A string  , eg "Hello",     no whitespace
            SERVER_VERSION: 'number:REQUIRED',
            VALIDATE: 'boolean:OPTIONAL',
            NEW: 'none:REQUIRED',
        },

        required_stages: ['EHLO'],  // -- You can specify stages that are required before 
        // this command can be run, eg, you can only run this command after DATA
        disallowed_stages: ['SWAG'], // -- You can also disallow stages

        mode: 'ANY', // -- Only want this command to work with ESMTP? or specifically HELO?
    }, (data) => {
        // -- You can assume that the data is valid here as it has been validated
        //    and the request would have been rejected if it wasnt, only place
        //    to keep in mind is if you define a paramater to be 'OPTIONAL' then
        //    you should check if it exists before using it
        log('INFO', 'Main', 'main', 'CUSTOM command received', data.parsed.get('SERVER_NAME'));
    });


})();