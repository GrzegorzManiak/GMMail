import RecvEmail from '../email/recv';
import Configuration from '../config';
import { WrappedSocket } from '../types';

export type VRFYResponseCode = 
    251 | // -- User not local; will forward to <forward-path>
    252 | // -- Cannot VRFY user, but will accept message and attempt delivery
    550 | // -- String does not match anything
    551 | // -- User not local; please try <forward-path>
    553;  // -- User ambiguous, not sure which one you mean
    
export type DATAResponseCode =
    250 | // -- OK
    354 | // -- Start mail input; end with <CRLF>.<CRLF>
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

export type CommandMap = Map<
    string, 
    (
        socket: WrappedSocket, 
        email: RecvEmail, 
        words: Array<string>, 
        raw: string,
        configuration: Configuration
    ) => Promise<void>
>;

export interface IMailFrom {
    user: string;
    domain: string;
    size: number;
    body: '7BIT' | '8BITMIME';
    address: string;
}

export interface IVRFYResponse {
    username?: string;
    address: string;
}


export type SMTPAuthType = 'PLAIN' | 'LOGIN' | 'CRAM-MD5' | 'DIGEST-MD5';