import RecvEmail from '../email/recv';
import { LogType } from '../log';
import { Socket as BunSocket } from 'bun';
import SMTP from '../smtp/smtp';
import { DATAResponseCode, IMailFrom, IVRFYResponse, RCPTTOResponseCode, VRFYResponseCode } from '../smtp/types';
import { IAddress } from '../email/types';


// -- PARSER TYPES
export type ICustomParserReturnType = 'string' | 'phrase' | 'number' | 'boolean' | 'none';
export type ICustomParserNeeds = 'REQUIRED' | 'OPTIONAL';
export type ICommandParserOption = `${ICustomParserReturnType}:${ICustomParserNeeds}`;
export interface ICustomParser { [data: string]: ICommandParserOption }
export type IParsedParser = Map<string, {
    need: ICustomParserNeeds,
    type: ICustomParserReturnType,
    raw: string,
    data: string | number | boolean,
}>;

export type ICustomCommandDataCallback = (data: ICustomCommandData) => void | number;
export interface ICustomCommandData {
    log: (type: LogType, ...args: Array<unknown>) => void,
    email: RecvEmail,

    socket: BunSocket<unknown>,
    smtp: SMTP,
    raw_data: string,
    words: Array<string>,
    type: string,
    _returned?: boolean,

    parsed: IParsedParser,
    _parsed?: boolean,
    _paramaters: ICustomParser,
    performance: {
        parser_start: number,
        parser_end: number,
        parser_time: number,
    }
}



export type IExtensionDataCallback = (data: IExtensionData) => void | number;
export interface IExtensionData {
    log: (type: LogType, ...args: Array<unknown>) => void,
    email: RecvEmail,
    socket: BunSocket<unknown>,
    smtp: SMTP,
    raw_data: string,
    words: Array<string>,
    type: ExtensionType,
}


export type IVrfyExtensionDataCallback = (data: IVRFYExtensionData) => void | VRFYResponseCode;
export interface IVRFYExtensionData extends IExtensionData {
    type: 'VRFY',
    _returned?: boolean,
    response: (data: IVRFYResponse) => void,
}


export type IDataExtensionDataCallback = (data: IDATAExtensionData) => void | DATAResponseCode;
export interface IDATAExtensionData extends IExtensionData {
    type: 'DATA',
    total_size: number,
    current_size: number,
    bypass_size_check: boolean,
    _returned?: boolean,
}


export type IRcptToExtensionDataCallback = (data: IRCPTTOExtensionData) => void | RCPTTOResponseCode;
export interface IRCPTTOExtensionData extends IExtensionData {
    type: 'RCPT TO',
    _returned?: boolean,
    recipient: IAddress,
    action: (action: 'ALLOW' | 'DENY') => void,
}


export type IMailFromExtensionDataCallback = (data: IMailFromExtensionData) => void | number;
export interface IMailFromExtensionData extends IExtensionData {
    type: 'MAIL FROM',
    _returned?: boolean,
    sender: IMailFrom,
}


/**
 * @name ExtensionDataUnion
 * @description A union of all extension data types
 */
export type ExtensionDataUnion = 
    IExtensionData | 
    IVRFYExtensionData |
    IDATAExtensionData;

export type CommandCallback =
    IExtensionDataCallback |
    IVrfyExtensionDataCallback |
    IDataExtensionDataCallback |
    IRcptToExtensionDataCallback |
    IMailFromExtensionDataCallback;

export type CustomIngressCallback = 
    ICustomCommandDataCallback;

export type CommandExtensionMap = Map<string, [CommandCallback]>;
export type CustomCommandEntry = { paramaters: ICustomParser, callback: CustomIngressCallback };
export type CustomIngressMap = Map<string, [CustomCommandEntry]>;

export type CommandExtension =
    'VRFY' |
    'DATA' |
    'QUIT' |
    'RSET' |
    'RCPT TO' |
    'MAIL FROM';



export type ExtensionType = CommandExtension;