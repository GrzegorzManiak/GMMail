import Configuration from './config';
import SMTP from './smtp/smtp';
import { log } from './log';
import ExtensionManager from './extensions/main';
import { IDATAExtensionData, IDATAExtensionDataCallback, IVRFYExtensionData, IVRFYExtensionDataCallback } from './extensions/types';


log('INFO', 'Main', 'main', 'Starting server...');
const config = Configuration.get_instance(import.meta.dir + '/../basic_config.json');



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
    extensions.add_command_extension<IVRFYExtensionDataCallback>('VRFY', (data) => {

        // -- Custom response after you maybe looked up the user in a database
        //    or a catchall, anything you want
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
    extensions.add_command_extension<IDATAExtensionDataCallback>('DATA', (data) => {
        data.bypass_size_check = false;
        if (data.total_size > 1300) return 552;
        return 250
    });

})();