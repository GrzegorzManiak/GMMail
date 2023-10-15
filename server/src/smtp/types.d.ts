export type SocketType = 'TLS' | 'SSL' | 'NIL';
import { Socket as BunSocket } from 'bun';
import RecvEmail from '../email/recv';

export type VRFYResponseCode = 
    250 | // -- OK
    251 | // -- User not local; will forward to <forward-path>
    252 | // -- Cannot VRFY user, but will accept message and attempt delivery
    502 | // -- Command not implemented
    504 | // -- Command parameter not implemented
    550 | // -- Requested action not taken: mailbox unavailable
    551 | // -- User not local; please try <forward-path>
    553;  // -- Requested action not taken: mailbox name not allowed
export type DATAResponseCode =
    250 | // -- OK
    450 | // -- Requested mail action not taken: mailbox unavailable
    451 | // -- Requested action aborted: local error in processing
    452 | // -- Requested action not taken: insufficient system storage
    550 | // -- Policy rejection
    552 | // -- Requested mail action aborted: exceeded storage allocation
    554;  // -- Transaction failed

export type RCPTTOResponseCode =
    250 | // -- OK
    251 | // -- User not local; will forward to <forward-path>
    450 | // -- Requested mail action not taken: mailbox unavailable
    451 | // -- Requested action aborted: local error in processing
    452 | // -- Requested action not taken: insufficient system storage
    550 | // -- Requested action not taken: mailbox unavailable
    551 | // -- User not local; please try <forward-path>
    552 | // -- Requested mail action aborted: exceeded storage allocation
    553 | // -- Requested action not taken: mailbox name not allowed
    555;  // -- MAIL FROM/RCPT TO parameters not recognized or not implemented

export type MAILFROMResponseCode =
    250 | // -- OK
    451 | // -- Requested action aborted: local error in processing
    452 | // -- Requested action not taken: insufficient system storage
    455 | // -- Server unable to accommodate parameters
    550 | // -- Requested action not taken: mailbox unavailable
    552 | // -- Requested mail action aborted: exceeded storage allocation
    553 | // -- Requested action not taken: mailbox name not allowed
    555;  // -- MAIL FROM/RCPT TO parameters not recognized or not implemented

export type CommandMap = Map<string, (socket: BunSocket<unknown>, email: RecvEmail, words: Array<string>, raw: string) => void>;

export interface IMailFrom {
    user: string;
    domain: string;
    size: number;
    body: '7BIT' | '8BITMIME';
}

export interface IVRFYResponse {
    username: string;
    address: string;
    code: VRFYResponseCode;
}
