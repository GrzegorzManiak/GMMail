export type MessageType = 'recv' | 'send';

export interface IMessage {
    content: string;
    type: MessageType;
    date: Date;
    code: number;
}

export type MessageStage = 
    'INIT' | 
    'VALIDATE';


export interface IAddress {
    local: string;
    domain: string;
}