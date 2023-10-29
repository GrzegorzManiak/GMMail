import { CallbackDataMap, CommandCallback, CommandExtension, CommandExtensionMap, CustomCommandEntry, CustomIngressCallback, CustomIngressMap, ExtensionDataUnion, ExtensionType, ICustomCommandDataCallback, ICustomCommandParamaters, ICustomParser, IExtensionData, IExtensionDataCallback } from './types';
import sender_spf_validator from './builtin/spf';
import dns_records from './builtin/dns';

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


