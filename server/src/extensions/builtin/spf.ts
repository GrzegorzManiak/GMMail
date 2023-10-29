import { resolveTxt } from 'dns';
import ExtensionManager from '../main';
import { IMailFromExtensionData } from '../types';



/**
* @name sender_spf_validator
* Custom RCPT TO listener, allows you to add custom checks eg, if you dont
* want to pass CC'd users to the email, you can deny them here
* 
* or you can use it for logging, spam prevention, etc
*/
export default (
    extensions: ExtensionManager
) => {
    // -- Ensure that the 'BUILTIN-MAILFROM-DNS-RECORDS' extension is loaded
    if (!extensions.command_extension_exists('BUILTIN-MAILFROM-DNS-RECORDS'))
        throw new Error('BUILTIN-SENDER-SPF-VALIDATOR requires BUILTIN-MAILFROM-DNS-RECORDS to be loaded');
    

    // -- Add the extension
    extensions.add_command_extension<IMailFromExtensionData>('MAIL FROM', async(data) => {

        // -- Get the domains TXT records
        const records = data.email.get_extra<string[][]>('dns_records');
        console.log(records);

    }, 'BUILTIN-SENDER-SPF-VALIDATOR');    
}