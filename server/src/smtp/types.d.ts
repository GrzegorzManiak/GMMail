export type SocketType = 'TLS' | 'SSL' | 'NIL';


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