import * as exp from "constants";

export interface ISMTPPorts {
    TLS: number;
    SSL: number;
    NIL: number;
}

export interface ISMTP {
    TLS: boolean;
    SSL: boolean;
    NIL: boolean;
}

export interface IMail {
    MAX_SIZE: number;
}

export type SMTPSend = [ 'SEND' ];
export type SMTPReceive = [ 'RECEIVE' ];
export type SMTPBoth = [ 'SEND', 'RECEIVE' ];

export type SMTPModeUnion = SMTPSend | SMTPReceive | SMTPBoth;

export interface ISMTPMode {
    TLS: SMTPModeUnion;
    SSL: SMTPModeUnion;
    NIL: SMTPModeUnion;
}

export interface IConfig {
    HOST: string;
    VENDOR: string;
    SMTP_PORTS: ISMTPPorts;
    SMTP: ISMTP;
    MAIL: IMail;
    SMTP_MODE: ISMTPMode;
}

export type ConfigKeys = 
    keyof IConfig | 
    keyof ISMTP |
    keyof IMail |
    keyof ISMTPPorts;
