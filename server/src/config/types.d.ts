export interface ISMTPPorts {
    PLAIN: number;
    SSL: number;
    STARTTLS: number;
}

export interface ISMTP {
    PLAIN: boolean;
    SSL: boolean;
    STARTTLS: boolean;
}

export interface IMail {
    MAX_SIZE: number;
}

export type SMTPSend = [ 'SEND' ];
export type SMTPReceive = [ 'RECEIVE' ];
export type SMTPBoth = [ 'SEND', 'RECEIVE' ];

export type SMTPModeUnion = SMTPSend | SMTPReceive | SMTPBoth;

export interface ISMTPMode {
    PLAIN: SMTPModeUnion;
    SSL: SMTPModeUnion;
    STARTTLS: SMTPModeUnion;
}

export interface ITLS {
    KEY: string;
    CERT: string;
}


export type SPFActions = 'DROP' | 'MARK';
export interface ISecurity {
    SPF: SPFActions
}

export interface IConfig {
    HOST: string;
    VENDOR: string;
    DOMAIN: string;
    SMTP_PORTS: ISMTPPorts;
    SMTP: ISMTP;
    MAIL: IMail;
    SMTP_MODE: ISMTPMode;
    TLS: ITLS;
    SECURITY: ISecurity
}

export type ConfigKeys = 
    keyof IConfig | 
    keyof ISMTP |
    keyof IMail |
    keyof ITLS |
    keyof ISMTPMode |
    keyof ISMTPPorts |
    keyof ISecurity;
