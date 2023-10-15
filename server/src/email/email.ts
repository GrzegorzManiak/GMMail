import { IMessage, MessageType } from './types';

export default class Email {
    private _id = crypto.randomUUID();
    private _created_at = new Date();
        
    private _message_sequence: Array<IMessage> = [];

    public constructor() {}


    public push_message(
        type: MessageType,
        content: string,
    ): void {
        // -- Push the message to the message sequence
        this._message_sequence.push({
            content,
            type,
            date: new Date(),
        });
    }

    public get id(): string { return this._id; }
}