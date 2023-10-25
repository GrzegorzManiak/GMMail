import Configuration from './config';
import SMTP from './smtp/smtp';
import ExtensionManager from './extensions/main';
import { log } from './log';
import { 
    ICustomCommandDataCallback,
    IDATAExtensionData,
    IMailFromExtensionData, 
    INoopExtensionData, 
    IQuitExtensionData, 
    IRCPTTOExtensionData, 
    IRsetExtensionData, 
    IStartTlsExtensionData, 
    IVRFYExtensionData, 
} from './extensions/types';
import { IMailFrom } from './smtp/types';


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
     * Heres all the ingress commands you can add extensions to, as you can
     * see, adding an extension is as simple as calling the add_command_extension
     * method and passing in the command name and a callback.
     * 
     * For better type safety, you can specify the type of the callback, eg
     * the extension data type, eg: IVRFYExtensionData, and TS will be able
     * to infer the object type that will be returned in the callback.
     * 
     * If you dont specify the type, you will be defualted to IExtensionData
     * which is the bearbones extension data type, with no specifc command
     * extension data, eg MAIL FROM data.action('DENY').
     * 
     * @example
     * extensions.add_command_extension<IVRFYExtensionData>('VRFY', (data) => {});
     * extensions.add_command_extension('VRFY', (data) => {});
     */



    /**
     * @name VRFY
     * Adds a step to the VRFY command to allow the user
     * to set custom VRFY responses / rules
     */
    extensions.add_command_extension<IVRFYExtensionData>('VRFY', (data) => {

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
    extensions.add_command_extension<IDATAExtensionData>('DATA', (data) => {
        data.bypass_size_check = false;
        if (data.total_size > 1300) return 552;
        
        if (data.email.sending_data) return 250;
        else return 354;
    });



    /**
     * @name QUIT
     * QUIT Listener, cant do much here bar maybe some custom desctruction
     * logic
     */
    extensions.add_command_extension<IQuitExtensionData>('QUIT', (data) => {
        log('INFO', 'Main', 'main', 'Client disconnected');
    });



    /**
     * @name RSET
     * RSET Listener, cant do much here bar maybe some custom desctruction
     * logic or logging
     */
    extensions.add_command_extension<IRsetExtensionData>('RSET', (data) => {
        log('INFO', 'Main', 'main', 'Client reset');
    });



    /**
     * @name RCPT TO
     * Custom RCPT TO listener, allows you to add custom checks eg, if you dont
     * want to pass CC'd users to the email, you can deny them here
     * 
     * or you can use it for logging, spam prevention, etc
     */
    extensions.add_command_extension<IRCPTTOExtensionData>('RCPT TO', (data) => {
        if (data.recipient.local === 'cc_email3') data.action('DENY');
    });



    /**
     * @name MAIL FROM
     * Custom RCPT TO listener, allows you to add custom checks eg, if you dont
     * want to pass CC'd users to the email, you can deny them here
     * 
     * or you can use it for logging, spam prevention, etc
     */
    extensions.add_command_extension<IMailFromExtensionData>('MAIL FROM', (data) => {
        if (data.sender.domain === 'example2.com') return 541;
        // -- You can return a 250, but thats the default
        return 250;
    });



    /**
     * @name STARTTLS
     * Block upgrade requests for whatever reason, not recommended lol but you do you
     */
    extensions.add_command_extension<IStartTlsExtensionData>('STARTTLS', (data) => {
        
        // -- Roulet, block 50% of requests
        // if (Math.random() > 0.5) return data.action('DENY');
        // else return data.action('ALLOW');
    });



    /**
     * @name NOOP
     * NOOP Listener, cant do much here bar maybe some custom nothing or 
     * other nothing logic
     */
    extensions.add_command_extension<INoopExtensionData>('NOOP', (data) => {
        log('INFO', 'Main', 'main', 'Client did nothing');
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

        feature_name: 'CUSTOM_TEST_CMD' // -- If you want to add a help tag, you can do so here
    }, (data) => {
        // -- You can assume that the data is valid here as it has been validated
        //    and the request would have been rejected if it wasnt, only place
        //    to keep in mind is if you define a paramater to be 'OPTIONAL' then
        //    you should check if it exists before using it
        log('INFO', 'Main', 'main', 'CUSTOM command received', data.parsed.get('SERVER_NAME'));
    });



    extensions.add_custom_ingress_command<ICustomCommandDataCallback>('AUTH', {
        feature_name: 'AUTH LOGIN GSSAPI DIGEST-MD5 PLAIN',
    }, (data) => {
        return 235;
    });

    // https://www.samlogic.net/articles/smtp-commands-reference.htm
})();