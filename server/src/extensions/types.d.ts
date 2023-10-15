import Email from '../email/email';
import { LogType } from '../log';
import { Socket as BunSocket } from 'bun';
import SMTP from '../smtp/smtp';
import { DATAResponseCode, IVRFYResponse, VRFYResponseCode } from '../smtp/types';


export type IExtensionDataCallback = (data: IExtensionData) => void | number;
export interface IExtensionData {
    log: (type: LogType, ...args: Array<unknown>) => void,
    email: Email,
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
    cancel: (code: DATAResponseCode) => void,
    total_size: number,
    current_size: number,
    bypass_size_check: boolean,
    _returned?: boolean,
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
    'DATA';



export type ExtensionType = CommandExtension;