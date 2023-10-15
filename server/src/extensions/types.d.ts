import RecvEmail from '../email/recv';
import { LogType } from '../log';
import { Socket as BunSocket } from 'bun';
import SMTP from '../smtp/smtp';
import { DATAResponseCode, IVRFYResponse, RCPTTOResponseCode, VRFYResponseCode } from '../smtp/types';
import { IAddress } from '../email/types';


export type IExtensionDataCallback = (data: IExtensionData) => void | number;
export interface IExtensionData {
    log: (type: LogType, ...args: Array<unknown>) => void,
    email: RecvEmail,
    socket: BunSocket<any>,
    smtp: SMTP,
    raw_data: string,
    words: Array<string>,
    type: ExtensionType,
}


export type IVRFYExtensionDataCallback = (data: IVRFYExtensionData) => void | VRFYResponseCode;
export interface IVRFYExtensionData extends IExtensionData {
    type: 'VRFY',
    _returned?: boolean,
    response: (data: IVRFYResponse) => void,
}


export type IDATAExtensionDataCallback = (data: IDATAExtensionData) => void | DATAResponseCode;
export interface IDATAExtensionData extends IExtensionData {
    type: 'DATA',
    total_size: number,
    current_size: number,
    bypass_size_check: boolean,
    _returned?: boolean,
}


export type IRCPTTOExtensionDataCallback = (data: IRCPTTOExtensionData) => void | RCPTTOResponseCode;
export interface IRCPTTOExtensionData extends IExtensionData {
    type: 'RCPT TO',
    _returned?: boolean,
    recipient: IAddress,
    action: (action: 'ALLOW' | 'DENY') => void,
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
    IVRFYExtensionDataCallback |
    IDATAExtensionDataCallback;

export type CommandExtensionMap = Map<string, [CommandCallback]>;
export type CommandExtension =
    'VRFY' |
    'DATA' |
    'QUIT' |
    'RSET' |
    'RCPT TO' 



export type ExtensionType = CommandExtension;