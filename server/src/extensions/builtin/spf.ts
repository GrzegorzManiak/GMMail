import { resolveTxt } from 'dns';
import ExtensionManager from '../main';
import { IMailFromExtensionData } from '../types';
// import spf_check from 'python-spfcheck2';
import { SPFActions } from '../../config/types';


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

        // // -- Get the SPF result and set it as an extra
        // const response: [string, string] = await spf_check(data.socket.remoteAddress, data.sender.address, data.sender.domain),
        //     result: string = response[0].toUpperCase(),
        //     explanation: string = response[1];

        // data.email.set_extra('spf_result', result);
        // data.email.set_extra('spf_explanation', explanation);



        // // -- If the SPF result is not a Pass, Neutral or None, deny the sender
        // const valid_results = ['PASS', 'NEUTRAL', 'NONE'];
        // if (!valid_results.includes(result)) {
        //     data.log('DEBUG', 'SMTP', 'process', `SPF result for ${data.socket.remoteAddress} ${data.sender.address} was ${result}, denying`);
        //     data.email.set_extra('spf_passed', false);
        //     data.action('SPF'); // -- Mark as SPF fail, dosent nessesarily mean deny

        //     // -- Check the config to see if we should deny the email
        //     if (data.configuration.get<SPFActions>('SECURITY', 'SPF') === 'DROP') data.action('DENY');
        //     return;
        // }
        


        // // -- These are not hard fails, but warrent a warning
        // if (result === 'NONE' || result === 'NEUTRAL') 
        //     data.log('DEBUG', 'SMTP', 'process', `SPF result for ${data.socket.remoteAddress} ${data.sender.address} was ${result}, allowing`);


        // // -- Allow the sender (Not final as we want to allow other extensions to run)
        // data.email.set_extra('spf_passed', true);
        // return data.action('ALLOW');

    }, 'BUILTIN-SENDER-SPF-VALIDATOR');    
}