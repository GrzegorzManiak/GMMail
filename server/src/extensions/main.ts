import { CommandCallback, CommandExtension, CommandExtensionMap, CustomCommandEntry, CustomIngressCallback, CustomIngressMap, ICustomCommandDataCallback, ICustomParser } from './types';



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
     * @param {CommandExtension} extension - The extension to add
     * @param {CommandCallback} callback - The callback to run when the extension is called
     * 
     * @returns {void}
     */
   public add_command_extension<CallbackType extends CommandCallback>(
       extension: CommandExtension,
       callback: CallbackType,
   ): void {

       // -- Attempt to get the existing extensions
       const extensions = this._command_extensions.get(extension);
       if (extensions) extensions.push(callback);

       // -- Create a new extension group
       else this._command_extensions.set(extension, [callback]);
   }



   /**
    * @name add_custom_ingress_command
    * @description Adds a custom ingress command parser
    * eg, For communications between your own servers.
    * 
    * NOTE: This is for INCOMING connections only, eg receiving mail
    * 
    * @param {string} command_name - The command name to add
    * @param {ICustomParser} paramaters - The paramaters to parse
    * @param {CommandCallback} callback - The callback to run when the command is called
    * 
    * @returns {void}
    */
    public add_custom_ingress_command<CallbackType extends CustomIngressCallback>(
        command_name: string,
        paramaters: ICustomParser,
        callback: CallbackType,
    ): void {
            
        // -- Attempt to get the existing extensions
        const extensions = this._custom_ingress_checks.get(command_name);
        if (extensions) extensions.push({ paramaters, callback });

        // -- Create a new extension group
        else this._custom_ingress_checks.set(command_name, [{ paramaters, callback }]);
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
    public _get_command_extension_group(key: CommandExtension): Array<CommandCallback> {
         return this._command_extensions.get(key) || [];
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
}