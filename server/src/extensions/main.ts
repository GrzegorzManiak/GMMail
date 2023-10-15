import Email from '../email/email';
import SMTP from '../smtp/smtp';
import { CommandCallback, CommandExtension, CommandExtensionMap } from './types';
import { Socket as BunSocket } from 'bun';

export default class ExtensionManager {
    private static _instance: ExtensionManager;
    private constructor() {}
    public static get_instance(): ExtensionManager {
        if (!ExtensionManager._instance) ExtensionManager._instance = new ExtensionManager();
        return ExtensionManager._instance;
    }
    
    
    private _command_extensions: CommandExtensionMap = new Map();


    /**
     * @name add_command_extension
     * @description Adds an extension to the SMTP server
     * 
     * @param {CommandExtension} extension - The extension to add
     * @param {CommandCallback} callback - The callback to run when the extension is called
    * 
    * @returns {void}
    */
   public add_command_extension(
       extension: CommandExtension,
       callback: CommandCallback
   ): void {

       // -- Attempt to get the existing extensions
       const extensions = this._command_extensions.get(extension);
       if (extensions) extensions.push(callback);

       // -- Create a new extension group
       else this._command_extensions.set(extension, [callback]);
   }



   /**
    * @name _get_command_extension_group
    * @description Gets the extension group for the given extension
    * Note: this is not a public function, and should only be 
    * called by the SMTP class or related processes
    * 
    * @param {string} key - The extension key to get the group for
    * 
    * @returns {Array<CommandCallback>} The extension group
    */
   public _get_command_extension_group(key: string): Array<CommandCallback> {
         return this._command_extensions.get(key) || [];
    }

}