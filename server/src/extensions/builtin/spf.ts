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
) => extensions.add_command_extension<IMailFromExtensionData>('MAIL FROM', async(data) => {

    // -- ADD ANOTHR DEFUALT EXTENSION TO GET DNS RECORDS SO MULTIPLE EXTENSIONS CAN USE IT
    // -- Get the domains TXT records
    const records: Array<Array<string>> = await new Promise((resolve) => 
        resolveTxt(data.sender.domain, (err, txt_records) => resolve(txt_records)));

    console.log(records);
});
