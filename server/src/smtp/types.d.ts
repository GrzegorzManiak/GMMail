export type SocketType = 'TLS' | 'SSL' | 'NIL';
import { Socket as BunSocket } from 'bun';
import Email from '../email/email';

export type VRFYResponseCode = 
    250 | // -- OK
    251 | // -- User not local; will forward to <forward-path>
    252 | // -- Cannot VRFY user, but will accept message and attempt delivery
    502 | // -- Command not implemented
    504 | // -- Command parameter not implemented
    550 | // -- Requested action not taken: mailbox unavailable
    551 | // -- User not local; please try <forward-path>
    553;  // -- Requested action not taken: mailbox name not allowed

export interface IVRFYResponse {
    username: string;
    address: string;
    code: VRFYResponseCode;
}

export type DATAResponseCode =
    250 | // -- OK
    450 | // -- Requested mail action not taken: mailbox unavailable
    451 | // -- Requested action aborted: local error in processing
    452 | // -- Requested action not taken: insufficient system storage
    550 | // -- Policy rejection
    552 | // -- Requested mail action aborted: exceeded storage allocation
    554;  // -- Transaction failed

export type CommandMap = Map<string, (socket: BunSocket<any>, email: Email, words: Array<string>, raw: string) => void>;