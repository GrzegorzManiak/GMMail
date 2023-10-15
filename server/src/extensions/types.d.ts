import Email from '../email/email';
import { LogType } from '../log';
import { Socket as BunSocket } from 'bun';
import SMTP from '../smtp/smtp';
import { IVRFYResponse } from '../smtp/types';



export interface IExtensionData {
    log: (type: LogType, ...args: Array<unknown>) => void,
    email: Email,
    socket: BunSocket<any>,
    smtp: SMTP,
    raw_data: string,
    words: Array<string>,
    type: ExtensionType,
}



export interface IVRFYExtensionData extends IExtensionData {
    type: 'VRFY',
    _returned?: boolean,
    response: (data: IVRFYResponse) => void,
}


export type ExtensionDataUnion = IExtensionData | IVRFYExtensionData;


export type CommandCallback = (data: ExtensionDataUnion) => number | void;
export type CommandExtensionMap = Map<string, [CommandCallback]>;
export type CommandExtension =
    'VRFY';


export type ExtensionType = CommandExtension;
export type ExtensionCallbackUnion = CommandCallback;