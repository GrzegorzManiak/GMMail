import { resolveTxt } from 'dns';
import ExtensionManager from '../main';
import { IMailFromExtensionData } from '../types';



/**
* @name dns_records
* This extension gets the DNS records for the sender domain, it than sets them
* under the 'dns_records' property on the sender mail object for other extensions
* to use (saves on DNS lookups)
*/
export default (
    extensions: ExtensionManager
) => {

    // -- Add the extension
    extensions.add_command_extension<IMailFromExtensionData>('MAIL FROM', async(data) => {

        // -- Get the domains TXT records
        const records: Array<Array<string>> = await new Promise((resolve) => 
            resolveTxt(data.sender.domain, (err, txt_records) => resolve(txt_records)));
    
        // -- Set the records
        data.email.set_extra('dns_records', records);

    }, 'BUILTIN-MAILFROM-DNS-RECORDS');    
}