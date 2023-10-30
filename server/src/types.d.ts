/**
 * Since I want this to run on both Bun.js and Node.js, we need to declare the types
 * in a way that both environments can understand.
 * 
 * The comprimise is that as a Node user you have to download the bun-types package
 * and as a Bun user, you have backwords compatibility with Node.js so you dont need
 * to do anything.
 */
import RecvEmail from './email/recv';

export type RuntimeType = 'NODE' | 'BUN';
export type SocketType = 'TLS' | 'STARTTLS' | 'NIL';



// -- Node.js
import { 
    TLSSocket as NodeTlsSocket,
    Server as NodeTLSServer
} from 'tls';
import { 
    Socket as NodeSocket,
    Server as NodeTCPServer
} from 'net';


// -- Bun.js
import { 
    TCPSocketListener as BunTCPSocketServer, 
    Socket as BunSocket 
} from 'bun';



// -- Common
export type JointSocket = 
    BunSocket<RecvEmail> | 
    NodeSocket | 
    NodeTlsSocket;

export type WrappedSocket = JointSocket & {
    data: RecvEmail | null;
};

export type JointServer =
    BunTCPSocketServer |
    NodeTLSServer |
    NodeTCPServer;

