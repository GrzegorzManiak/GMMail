import Configuration from './config';
import SMTP from './smtp/smtp';
import { log } from './log';



log('INFO', 'Main', 'main', 'Starting server...');
const config = Configuration.get_instance(import.meta.dir + '/../basic_config.json');



(async () => {

    // -- Await the configuration file
    await config.await_config();
    log('INFO', 'Main', 'main', 'Server started');


    // -- Load the SMTP server
    const smtp = SMTP.get_instance();
})();