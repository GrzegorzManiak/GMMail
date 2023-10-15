export type MessageType = 'recv' | 'send';
export interface IMessage {
    content: string;
    type: MessageType;
    date: Date;
}