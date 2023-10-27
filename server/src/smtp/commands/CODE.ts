import Configuration from '../../config';
import SMTP from '../ingress/ingress';

export default (
    code: number,
    details: string = 'None',
): string => {
    const config = Configuration.get_instance(),
        domain = config.get<string>('DOMAIN'),
        vendor = config.get<string>('VENDOR'),
        date = new Date();

    // -- Truncate details to 100 characters
    if (details.length > 100) details = details.substr(0, 100);

    switch (code) {
        case 213: return `213-${domain} The following commands are recognized by ${vendor}\r\n`;

        case 220: return `220 ${domain} ESMTP ${vendor} Ready\r\n`;
        case 2201: return `220 Go ahead\r\n`;

        case 221: return `221 ${domain} running ${vendor} closing connection \r\n`;
        case 250: return `250 OK\r\n`;
        
        // -- Special case for HELO/EHLO
        case 2501: return `250-${domain} is my domain name.\r\n`;
        case 2502: return `250 ${domain} is my domain name.\r\n`;
        case 2503: return `250-${details}\r\n`;
        case 2504: return `250 ${details}\r\n`;

        case 354: return `354 Start mail input; end with <CR><LF>${SMTP.get_instance().crlf}<CR><LF>\r\n`;
        case 421: return `421 ${domain} Service not available, closing transmission channel\r\n`;
        case 450: return `450 ${domain} Mailbox unavailable (busy or temporarily blocked). Requested action aborted\r\n`;
        case 451: return `451 ${domain} Requested action aborted: local error in processing\r\n`;
        case 452: return `452 ${domain} Requested action not taken: insufficient system storage\r\n`;
        case 454: return `454 ${domain} TLS not available due to temporary reason\r\n`;
        
        case 500: return `500 ${domain} Syntax error, command unrecognized | [Details] ${details}\r\n`;
        case 501: return `501 ${domain} Syntax error in parameters or arguments | [Details] ${details}\r\n`;
        case 502: return `502 ${domain} Command not implemented | [Details] ${details}\r\n`;
        case 503: return `503 ${domain} Bad sequence of commands\r\n`;
        case 504: return `504 ${domain} Command parameter not implemented | [Details] ${details}\r\n`;
        case 510: return `510 ${domain} Bad email address | [Details] ${details}\r\n`;
        case 512: return `512 ${domain} Host server for the recipient's domain name cannot be found | [Details] ${details}\r\n`;
        case 523: return `523 ${domain} Total size exceeds maximum size\r\n`;
        case 541: return `541 ${domain} Rejected for policy reasons\r\n`;
        case 550: return `550 ${domain} Requested action not taken: mailbox unavailable\r\n`;
        case 552: return `552 ${domain} Requested mail action aborted: exceeded storage allocation\r\n`;
        case 553: return `553 ${domain} Requested action not taken: mailbox name not allowed\r\n`;
        case 554: return `554 ${domain} Transaction failed\r\n`;
    }

    return `${code} No reason given\r\n`;
};