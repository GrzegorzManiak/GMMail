import { 
    CallbackDataMap, 
    CommandCallback, 
    CommandExtension, 
    CommandExtensionMap, 
    CustomCommandEntry, 
    CustomIngressCallback, 
    CustomIngressMap, 
    ExtensionDataUnion, 
    ICustomCommandParamaters, 
    IExtensionData 
} from './types';
import sender_spf_validator from './builtin/spf';
import dns_records from './builtin/dns';


/**
 * @name ExtensionManager
 * 
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
*    
*
*   
* @name VRFY
* Adds a step to the VRFY command to allow the user
* to set custom VRFY responses / rules
*
* @example
* extensions.add_command_extension<IVRFYExtensionData>('VRFY', (data) => {
*
*   // -- Custom response after you maybe looked up the user in a database
*   //    or a catchall, unknownthing you want
*   data.action({
*       username: 'Test',
*       address: 'test@test.com',
*   });
*
*
*   // -- Or a whole array of users
*   data.action([
*       { username: 'Test', address: 'dd@ddd.com', },
*       { username: 'Test', address: 'aa@aaaa.com', },
*   ]);
* });
*
*
*    
* @name DATA
* Adds a step to the DATA command to allow the user
* to controll the DATA command, eg bypass limits
* or add custom checks
*     
* @example
* extensions.add_command_extension<IDATAExtensionData>('DATA', async(data) => {
*   data.bypass_size_check = true;
*   // if(data.total_size > 1000) data.action('DENY');
* });
*
*
*
* 
* @name QUIT
* QUIT Listener, cant do much here bar maybe some custom desctruction
* logic
* 
* @example
* extensions.add_command_extension<IQuitExtensionData>('QUIT', (data) => {
*   log('INFO', 'Main', 'main', 'Client disconnected');
* });
*
*
* 
* @name RSET
* RSET Listener, cant do much here bar maybe some custom desctruction
* logic or logging
* 
* @example
* extensions.add_command_extension<IRsetExtensionData>('RSET', (data) => {
*   log('INFO', 'Main', 'main', 'Client reset');
* });
*
*
*
* 
* @name RCPT TO
* Custom RCPT TO listener, allows you to add custom checks eg, if you dont
* want to pass CC'd users to the email, you can deny them here
* 
* or you can use it for logging, spam prevention, etc
* 
* @example
* extensions.add_command_extension<IRCPTTOExtensionData>('RCPT TO', (data) => {
*   if (data.recipient.local === 'cc_email3') data.action('DENY');
* });
*
*
*
* 
* @name MAIL FROM
* Custom RCPT TO listener, allows you to add custom checks eg, if you dont
* want to pass CC'd users to the email, you can deny them here
* 
* or you can use it for logging, spam prevention, etc
*
* @example
* extensions.add_command_extension<IMailFromExtensionData>('MAIL FROM', async(data) => {
* });
*
*
*
* 
* @name STARTTLS
* Block upgrade requests for whatever reason, not recommended lol but you do you
*
* @example
* extensions.add_command_extension<IStartTlsExtensionData>('STARTTLS', (data) => {
*   // -- Roulet, block 50% of requests
*   if (Math.random() > 0.5) return data.action('DENY');
*   else return data.action('ALLOW');
* });
*
*
*
* 
* @name NOOP
* NOOP Listener, cant do much here bar maybe some custom nothing or 
* other nothing logic
*   
* @example
* extensions.add_command_extension<INoopExtensionData>('NOOP', (data) => {
*   log('INFO', 'Main', 'main', 'Client did nothing');
* });
*
*
*
* 
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
*  
* @example
* extensions.add_custom_ingress_command<ICustomCommandDataCallback>('CUSTOM', {
*   parser: {
*       SERVER_NAME: 'phrase:REQUIRED', // -- A sentance, eg "My Server", has whitespace
*       TEST: 'string:REQUIRED',        // -- A string  , eg "Hello",     no whitespace
*       SERVER_VERSION: 'number:REQUIRED',
*       VALIDATE: 'boolean:OPTIONAL',
*       NEW: 'none:REQUIRED',
*   },
*
*   required_stages: ['EHLO'],  // -- You can specify stages that are required before 
*   // this command can be run, eg, you can only run this command after DATA
*   disallowed_stages: ['SWAG'], // -- You can also disallow stages
*
*   mode: 'ANY', // -- Only want this command to work with ESMTP? or specifically HELO?
*
*   feature_name: 'CUSTOM_TEST_CMD' // -- If you want to add a help tag, you can do so here
* }, (data) => {
*   // -- You can assume that the data is valid here as it has been validated
*   //    and the request would have been rejected if it wasnt, only place
*   //    to keep in mind is if you define a paramater to be 'OPTIONAL' then
*   //    you should check if it exists before using it
*   log('INFO', 'Main', 'main', 'CUSTOM command received', data.parsed.get('SERVER_NAME'));
* });
*/
export default class ExtensionManager {
    private static _instance: ExtensionManager;
    private constructor() {}
    public static get_instance(): ExtensionManager {
        if (!ExtensionManager._instance) ExtensionManager._instance = new ExtensionManager();
        return ExtensionManager._instance;
    }
    
    
    private _command_extensions: CommandExtensionMap = new Map();
    private _custom_ingress_checks: CustomIngressMap = new Map();



    /**
     * @name add_command_extension
     * @description Adds an extension to the SMTP server
     * 
     * @param {ExtensionType} extension - The extension to add
     * @param {CommandCallback} callback - The callback to run when the extension is called
     * @param {string} id - The ID of the extension
     * 
     * @returns {void}
     */
    public add_command_extension<T extends ExtensionDataUnion = IExtensionData>(
        extension: T['type'],
        callback: Extract<CallbackDataMap, { key: T['type'] } > ['value'],
        id: string = null,
    ): void {
        // -- Build the extension data
        const extension_data = {
            id: id || `${extension}-${Math.random().toString(36).substring(7)}`,
            callback,
        };

        // -- Ensure that no other extension has the same ID
        this._command_extensions.forEach((extensions) => {
            extensions.forEach((extension) => {
                if (extension.id === extension_data.id) 
                    throw new Error(`Extension ID ${extension_data.id} already exists`);
            });
        });

        
        // -- Attempt to get the existing extensions
        const extensions = this._command_extensions.get(extension);
        if (extensions) extensions.push(extension_data);

        // -- Create a new extension group
        else this._command_extensions.set(extension, [extension_data]);
    }



   /**
    * @name add_custom_ingress_command
    * @description Adds a custom ingress command parser
    * eg, For communications between your own servers.
    * 
    * NOTE: This is for INCOMING connections only, eg receiving mail
    * 
    * @param {string} command_name - The command name to add
    * @param {ICustomCommandParamaters} paramaters - The paramaters to parse
    * @param {CommandCallback} callback - The callback to run when the command is called
    * @param {string} id - The ID of the extension
    * 
    * @returns {void}
    */
    public add_custom_ingress_command<CallbackType extends CustomIngressCallback>(
        command_name: string,
        paramaters: ICustomCommandParamaters,
        callback: CallbackType,
        id: string = null,
    ): void {
            
        // -- Attempt to get the existing extensions
        const extensions = this._custom_ingress_checks.get(command_name);
        const extension = {
            paramaters: paramaters?.parser || {},
            required_stages: paramaters?.required_stages || [],
            disallowed_stages: paramaters?.disallowed_stages || [],
            mode: paramaters?.mode || 'ANY',
            callback,
            feature_name: paramaters?.feature_name || null,
            id: id || `${command_name}-${Math.random().toString(36).substring(7)}`,
        };


        // -- If the extensions exist, push the new extension
        if (extensions) extensions.push(extension);
        else this._custom_ingress_checks.set(command_name, [extension]);
    }



   /**
    * @name _get_command_extension_group
    * @description Gets the extension group for the given extension
    * Note: this is not a public function, and should only be 
    * called by the SMTP class or related processes
    * 
    * @param {CommandExtension} key - The extension key to get the group for
    * 
    * @returns {Array<CommandCallback>} The extension group
    */
    public _get_command_extension_group(key: CommandExtension): Array<{
        id: string,
        callback: CommandCallback,
    }> {
        return this._command_extensions.get(key) || [];
    }



    /**
     * @name command_extension_exists
     * @description Checks if the given command extension exists
     * 
     * @param {string | Array<string>} id - the ID/s of the extension to check
     * 
     * @returns {boolean} If the extension / group of extensions exists
     */
    public command_extension_exists(id: string | Array<string>): boolean {
       
        // -- Ensure that the ID is an array
        if (!Array.isArray(id)) id = [id];

        // -- Check if the extension exists
        let exists = true;

        // -- Loop through the IDs
        for (let i = 0; i < id.length; i++) {
            exists = false;
            this._command_extensions.forEach((extensions) => {
                extensions.forEach((extension) => {
                    if (extension.id === id[i]) exists = true;
                });
            });
        }

        // -- Return if the extension exists
        return exists;
    }



    /**
     * @name _is_custom_ingress_command
     * @description Checks if the given command is a custom ingress command
     * 
     * @param {string} command_name - The command name to check
     * 
     * @returns {Array<CustomCommandEntry>} The extension group
     */
    public _is_custom_ingress_command(command_name: string): Array<CustomCommandEntry> {
        return this._custom_ingress_checks.get(command_name) || [];
    }



    /**
     * @name _get_all_custom_ingress_commands
     * @description Gets all the custom ingress commands
     * 
     * @returns {CustomIngressMap} All the custom ingress commands
     */
    public _get_all_custom_ingress_commands(): CustomIngressMap {
        return this._custom_ingress_checks
    }



    /**
     * @name add_defualt_extensions
     * @description Adds the default extensions to the SMTP server
     * you can pick and choose which ones you want to add, this 
     * function is just a shortcut to add them all (as you probably
     * want to do)
     * 
     * @extension sender_spf_validator - Validates the sender tru SPF
     */
    public add_defualt_extensions() {
        dns_records(this);
        sender_spf_validator(this);
    }
}


