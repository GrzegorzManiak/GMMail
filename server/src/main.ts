import Configuration from './config';
import SMTP from './smtp/ingress/ingress';
import ExtensionManager from './extensions/main';
import { log } from './log';
import path from 'path';
import { env } from 'process';
import { IConfig, RuntimeType } from './types';



export default class GMMail {
    private static _instance: GMMail;
    private _smtp: SMTP;
    private _extensions: ExtensionManager;
    private _config: Configuration; 



    // -- This is a global internal variable that will be used to determine if the
    //    server is running in a BUN environment or a NODE environment, it cant be
    //    changed at runtime.
    private static _runtime: RuntimeType;
    static get runtime(): RuntimeType { 
        if (!GMMail._runtime) GMMail._runtime = (env.RUNTIME || 'BUN') as RuntimeType;
        if (GMMail._runtime !== 'BUN' && GMMail._runtime !== 'NODE') {
            log('ERROR', 'GMMail', 'runtime', `Invalid runtime type: ${GMMail._runtime}`);
            throw new Error(`Invalid runtime type: ${GMMail._runtime}`);
        }
        return GMMail._runtime;
    }



    // -- Constructor
    private constructor(config: IConfig) {

        
        // -- Fill the config
        const filled_config: IConfig = {
            ...config,
            load_defaults: config.load_defaults || true,
            path: config.path || '../basic_config.json',
            runtime: config.runtime || 'BUN',
        };


        // -- Load the config
        const abs_config_path = path.resolve(filled_config.path);
        log('DEBUG', 'GMMail', 'constructor', 'Creating GMMail instance');
        this._config = Configuration.get_instance(abs_config_path);

        
        // -- Wait for the config to load
        this._config.await_config().then(() => {
            log('DEBUG', 'GMMail', 'constructor', 'Config loaded, creating SMTP instance');
            this._smtp = SMTP.get_instance();
            this._extensions = ExtensionManager.get_instance();
            this._smtp.start_listening();
        });
    }



    /**
     * @name get_instance
     * @description Gets the instance of the GMMail class
     *
     * @returns {GMMail} The instance of the GMMail class
     */
    public static get_instance(config: IConfig): GMMail {
        if (!this._instance) this._instance = new GMMail(config);
        return this._instance;
    }



    /**
     * @name await_config
     * @description Awaits the configuration file to be loaded
     * 
     * @returns {Promise<void>} A promise that resolves when the configuration file is loaded
     */
    public await_config(): Promise<void> {
        return this._config.await_config();
    }


    



    /**
     * @name extensions
     * @description Returns the extension manager
     * 
     * @returns {ExtensionManager} The extension manager
     */
    public get extensions(): ExtensionManager {
        return this._extensions;
    }



    /**
     * @name smtp
     * @description Returns the SMTP instance
     * 
     * @returns {SMTP} The SMTP instance
     */
    public get smtp(): SMTP {
        return this._smtp;
    }
}