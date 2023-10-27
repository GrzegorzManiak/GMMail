import { log } from '../log';
import { ConfigKeys, IConfig } from './types';


export default class Configuration {

    private static _instance: Configuration;
    private _config: IConfig;

    public readonly CONFIG_FILE: string;
    private _config_loaded: boolean = false;
    private _raw_config: string = '';
    


    private constructor(
        config_path: string
    ) { 
        log('DEBUG', 'Configuration', 'constructor', 'Loading configuration file');
        this.CONFIG_FILE = config_path;

        // -- Attempt to load the configuration file
        this._load_config();
    }



    public static get_instance(
        config_path: string | null = '../basic_config.json'
    ): Configuration {
        if (!Configuration._instance) Configuration._instance = new Configuration(config_path);
        return Configuration._instance;
    }



    /**
     * @name _load_config
     * @description Internal function to load the configuration file
     * 
     * @returns {Promise<void>} A promise that resolves when the configuration file is loaded
     */
    private async _load_config() {
        // -- Ensure that the configuration file is not already loaded
        if (this._config_loaded) return log(
            'WARN', 'Configuration', '_load_config', 'Configuration file already loaded');
        
        // -- Attempt to load the configuration file
        const config = Bun.file(this.CONFIG_FILE, { type: 'application/json' });

        // -- Check if the configuration file exists
        if (!await config.exists()) return log(
            'ERROR', 'Configuration', '_load_config', `Configuration file does not exist: ${this.CONFIG_FILE}`);


            
        // -- Load the configuration file
        this._raw_config = await config.text();
        this._config = await config.json();

        // -- Merge the configuration file with the default configuration
        this._config = this._merge_config();

        // -- Set the configuration file as loaded
        this._config_loaded = true;
    }



    /**
     * @name await_config
     * @description Awaits the configuration file to be loaded
     * 
     * @returns {Promise<void>} A promise that resolves when the configuration file is loaded
     */
    public await_config = (): Promise<void> => new Promise((resolve, reject) => {
        // -- If the configuration file is already loaded, return
        if (this._config_loaded) return resolve();
        
        // -- Await the configuration file to be loaded
        const interval = setInterval(() => {
            if (this._config_loaded) {
                clearInterval(interval);
                return resolve();
            }
        }, 100);
    });



    /**
     * @name default
     * @description Returns the default configuration
     * 
     * @returns {IConfig} The default configuration
     */
    public static default = (): IConfig => ({
        HOST: 'localhost',
        DOMAIN: 'localhost',
        VENDOR: 'GMMail',
        SMTP_PORTS: {
            TLS: 587,
            SSL: 465,
            NIL: 25
        },
        SMTP: {
            TLS: true,
            SSL: true,
            NIL: true
        },
        MAIL: {
            MAX_SIZE: 1024 * 1024 * 10, // -- 10MB
        },
        SMTP_MODE: {
            TLS: [ 'SEND', 'RECEIVE' ],
            SSL: [ 'SEND', 'RECEIVE' ],
            NIL: [ 'SEND', 'RECEIVE' ]
        },
        TLS: {
            KEY: '../certs/gmmail_key.pem',
            CERT: '../certs/gmmail_cert.pem'
        }
    });



    /**
     * @name _merge_config
     * @description Merges the default configuration with the loaded configuration
     * ensuring that all required fields are present and that they are of the correct type
     * 
     * @returns {IConfig} The merged configuration
     */
    private _merge_config(): IConfig {
        const default_config = Configuration.default();


        // -- Loop through the default configuration
        // def_obj: is our reference to the default configuration
        // imported_obj: is the configuration that was imported
        const walk = (
            def_obj: unknown, 
            imported_obj: unknown, 
            path: string[] = []
        ) => {
            
            const keys = Object.keys(def_obj);
            
            // -- Loop through the keys in the default configuration
            keys.forEach(key => {

                // -- Check if the key exists in the imported configuration
                if (!imported_obj.hasOwnProperty(key)) {
                    log('WARN', 'Configuration', '_merge_config', `Missing key: ${path.join('.')}.${key}`);
                    imported_obj[key] = def_obj[key];
                }

                // -- Go deeper into the configuration
                else if (typeof imported_obj[key] === 'object') {
                    walk(def_obj[key], imported_obj[key], [...path, key]);
                }

                // -- Ensure that the values are of the correct type
                else if (typeof imported_obj[key] !== typeof def_obj[key]) {
                    log('WARN', 'Configuration', '_merge_config', `Invalid type: ${path.join('.')}.${key}`);
                    imported_obj[key] = def_obj[key];
                }

                // -- If they are of the correct type, continue
                else {
                    def_obj[key] = imported_obj[key];
                    return;
                }
            });
        }


        // -- Walk through the default configuration
        walk(default_config, this._config);
        log('DEBUG', 'Configuration', '_merge_config', 'Configuration file loaded');
        return this._config as IConfig;
    }



    /**
     * @name get
     * @description Returns a key from the configuration
     * 
     * @param {Array<ConfigKeys>} key The key to return
     * 
     * @example
     * const config = Configuration.get_instance();
     * const port = config.get<number>('SMTP_PORTS', 'TLS');
     * 
     * @returns {IConfig[T]} The value of the key
     */
    public get = <T>(...key: Array<ConfigKeys>): T => {
        // -- Ensure that the configuration file is loaded
        if (!this._config_loaded) throw new Error('Configuration file not loaded');

        // -- Loop through the keys
        let value: unknown = this._config;
        key.forEach(k => value = value[k]);

        // -- Return the value
        return value as T;
    };
}