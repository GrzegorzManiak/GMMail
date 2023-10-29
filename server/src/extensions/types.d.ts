import RecvEmail from '../email/recv';
import { LogType } from '../log';
import { Socket as NodeSocket } from 'net';
import SMTP from '../smtp/ingress/ingress';
import { DATAResponseCode, IMailFrom, IVRFYResponse, RCPTTOResponseCode, VRFYResponseCode } from '../smtp/types';
import { IAddress } from '../email/types';



/**
 * @name ICustomParserReturnType
 * Return types that the custom command paramater parser can return
 * 
 * @type {string} - A string that cannot contain spaces Eg, 'X=HelloWorld' and dosen't need to be surrounded by quotes
 * @type {phrase} - A string that can contain spaces AND must be surrounded by quotes Eg, 'X="Hello World"'
 * @type {number} - 'X=100000000'
 * @type {boolean} - 'X=true' or 'X=false'
 * @type {none} - Nothing, just the param name Eg, 'X'
 */
export type ICustomParserReturnType = 'string' | 'phrase' | 'number' | 'boolean' | 'none';



/**
 * @name ICustomParserNeeds
 * If a paramater is required or optional for the paramater parser
 * 
 * @note Optional paramaters can be null and may impact the performance
 * of the parser if used heavily.
 * 
 * @type {REQUIRED} - The paramater is required
 * @type {OPTIONAL} - The paramater is optional (potentiall to be null) 
 */
export type ICustomParserNeeds = 'REQUIRED' | 'OPTIONAL';



/**
 * @name ICommandParserOption
 * A string that contains the return type and if the paramater is required or optional
 * 
 * @example 
 * 'string:REQUIRED' // - A string that is required
 * 'string:OPTIONAL' // - A string that is optional
 * 'phrase:REQUIRED' // - A phrase that is required
 * 'phrase:OPTIONAL' // - A phrase that is optional
 * 'number:REQUIRED' // - A number that is required
 * 'number:OPTIONAL' // - A number that is optional
 * 'boolean:REQUIRED' // - A boolean that is required
 * 'boolean:OPTIONAL' // - A boolean that is optional
 * 'none:REQUIRED' // - A paramater that is required
 * 'none:OPTIONAL' // - A paramater that is optional
 */
export type ICommandParserOption = `${ICustomParserReturnType}:${ICustomParserNeeds}`;



/**
 * @name ICustomParser
 * An object passed into the custom command parser that contains the paramaters
 * that the parser should parse
 * 
 * @example
 * const paramaters = { 'X': 'string:REQUIRED' };
 * 
 * const parsed = parse_command('CUSTOM', 'CUSTOM: X=HelloWorld', paramaters);
 * // parsed => new Map<string, { need: 'REQUIRED', type: 'string', raw: 'X=HelloWorld', data: 'HelloWorld' }>
 */
export interface ICustomParser { [data: string]: ICommandParserOption }




/**
 * @name IParsedParser
 * Represents a Map of parsed parameters returned by the custom command parser.
 *
 * @property {string} key - The parameter name.
 * @property {ICustomParserNeeds} need - Indicates whether the parameter is required or optional.
 * @property {ICustomParserReturnType} type - Specifies the type of the parameter.
 * @property {string} raw - The raw parameter string.
 * @property {string | number | boolean} data - The parsed parameter data.
 */

export type IParsedParser = Map<string, {
    need: ICustomParserNeeds,
    type: ICustomParserReturnType,
    raw: string,
    data: string | number | boolean,
}>;



/**
 * @name ICustomCommandParamaters
 * Optional paramaters that state how this command
 * should behave
 * 
 */
export interface ICustomCommandParamaters {
    parser?: ICustomParser,
    required_stages?: Array<string>,
    disallowed_stages?: Array<string>,
    mode?: 'SMTP' | 'ESMTP' | 'ANY',
    feature_name?: string | null,
}



export type ICustomCommandDataCallback = (data: ICustomCommandData) => void | number;
export interface ICustomCommandData {
    log: (type: LogType, ...args: Array<unknown>) => void,
    email: RecvEmail,

    socket: NodeSocket,
    smtp: SMTP,
    raw_data: string,
    words: Array<string>,
    type: string,
    _returned?: boolean,

    parsed: IParsedParser,
    _parsed?: boolean,
    _paramaters: ICustomParser,
    performance: {
        parser_start: BigInt,
        parser_end: BigInt,
        parser_time: BigInt,
    }
}


export type IExtensionDataCallback = (data: IExtensionData) => void;
export interface IExtensionData {
    log: (type: LogType, ...args: Array<unknown>) => void,
    email: RecvEmail,
    socket: NodeSocket,
    smtp: SMTP,
    raw_data: string,
    words: Array<string>,
    type: CommandExtension,
}


// -- VRFY
// http://www.smtp-server.com/simple_mail_verifying.htm
export type IVrfyExtensionDataCallback = (data: IVRFYExtensionData) => void;
export interface IVRFYExtensionData extends IExtensionData {
    type: 'VRFY',
    found_users: Array<IVRFYResponse>,
    action: (data: IVRFYResponse | Array<IVRFYResponse>) => void,
}


// -- STARTTLS
export type IStartTlsExtensionDataCallback = (data: IStartTlsExtensionData) => void;
export type StartTlsActions = `${'ALLOW' | 'DENY'}${':FINAL' | ''}`;
export interface IStartTlsExtensionData extends IExtensionData {
    type: 'STARTTLS',
    current_status: StartTlsActions,
    action: (action: StartTlsActions) => void,
}


// -- DATA
export type IDataExtensionDataCallback = (data: IDATAExtensionData) => void;
export type DataActions = 'ALLOW' | 'DENY';
export interface IDATAExtensionData extends IExtensionData {
    type: 'DATA',
    current_size: number,
    bypass_size_check: boolean,
    total_size: number,
    data_lines: Array<string>,
    action: (action: DataActions) => void,
}


// -- RCPT TO
export type IRcptToExtensionDataCallback = (data: IRCPTTOExtensionData) => void;
export type RcptToActions = `${'ALLOW' | 'DENY'}${':FINAL' | ''}`;
export interface IRCPTTOExtensionData extends IExtensionData {
    type: 'RCPT TO',
    recipient: IAddress,
    action: (action: RcptToActions) => void,
}


// -- MAIL FROM
export type IMailFromExtensionDataCallback = (data: IMailFromExtensionData) => void;
export type MailFromActions = `${'ALLOW' | 'DENY'}${':FINAL' | ''}`;
export interface IMailFromExtensionData extends IExtensionData {
    type: 'MAIL FROM',
    sender: IMailFrom,
    action: (action: MailFromActions) => void,
}


export type IQuitExtensionDataCallback = (data: IQuitExtensionData) => void;
export interface IQuitExtensionData extends IExtensionData {
    type: 'QUIT',
}


export type IRsetExtensionDataCallback = (data: IRsetExtensionData) => void;
export interface IRsetExtensionData extends IExtensionData {
    type: 'RSET',
}


export type INoopExtensionDataCallback = (data: INoopExtensionData) => void;
export interface INoopExtensionData extends IExtensionData {
    type: 'NOOP',
}



/**
 * @name ExtensionDataUnion
 * @description A union of all extension data types
 */
export type ExtensionDataUnion = 
    IExtensionData | 
    IVRFYExtensionData |
    IDATAExtensionData |
    IRCPTTOExtensionData |
    IMailFromExtensionData |
    IStartTlsExtensionData |
    IQuitExtensionData |
    IRsetExtensionData |
    INoopExtensionData;

export type CommandCallback =
    IExtensionDataCallback |
    IVrfyExtensionDataCallback |
    IDataExtensionDataCallback |
    IRcptToExtensionDataCallback |
    IMailFromExtensionDataCallback |
    IStartTlsExtensionDataCallback |
    IQuitExtensionDataCallback |
    IRsetExtensionDataCallback |
    INoopExtensionDataCallback;

export type CallbackDataMap =
    { key: 'VRFY', value: IVrfyExtensionDataCallback } |
    { key: 'DATA', value: IDataExtensionDataCallback } |
    { key: 'RCPT TO', value: IRcptToExtensionDataCallback } |
    { key: 'MAIL FROM', value: IMailFromExtensionDataCallback } |
    { key: 'STARTTLS', value: IStartTlsExtensionDataCallback } |
    { key: 'QUIT', value: IQuitExtensionDataCallback } |
    { key: 'RSET', value: IRsetExtensionDataCallback } |
    { key: 'NOOP', value: INoopExtensionDataCallback } |
    { key: 'GENERIC', value: IExtensionDataCallback };
    
export type CustomIngressCallback = 
    ICustomCommandDataCallback;

export type CommandExtensionMap = Map<string, [CommandCallback]>;
export type CustomCommandEntry = { 
    paramaters: ICustomParser, 
    callback: CustomIngressCallback,
    required_stages: Array<string>,
    disallowed_stages: Array<string>,
    mode: 'ESMTP' | 'SMTP' | 'ANY',
    feature_name: string | null,
};
export type CustomIngressMap = Map<string, [CustomCommandEntry]>;

export type CommandExtension =
    'GENERIC' |
    'VRFY' |
    'DATA' |
    'QUIT' |
    'RSET' |
    'NOOP' |
    'STARTTLS' |
    'RCPT TO' |
    'MAIL FROM';



export type ExtensionType = CommandExtension;