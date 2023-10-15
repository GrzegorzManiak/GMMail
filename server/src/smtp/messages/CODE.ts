import Configuration from '../../config';

export default (
    code: number,
    details: string = 'None',
): string => {
    const config = Configuration.get_instance(),
        host = config.get<string>('HOST');

    // -- Truncate details to 100 characters
    if (details.length > 100) details = details.substr(0, 100);

    switch (code) {
        case 221: return `221 ${host} Service closing transmission channel\r\n`;
        case 421: return `421 ${host} Service not available, closing transmission channel\r\n`;
        case 451: return `451 ${host} Requested action aborted: local error in processing\r\n`;
        case 500: return `500 ${host} Syntax error, command unrecognized | [Details] ${details}\r\n`;
        case 502: return `502 ${host} Command not implemented | [Details] ${details}\r\n`;
        case 503: return `503 ${host} Bad sequence of commands\r\n`;
        case 504: return `504 ${host} Command parameter not implemented | [Details] ${details}\r\n`;
        case 510: return `510 ${host} Bad email address | [Details] ${details}\r\n`;
        case 512: return `512 ${host} Host server for the recipient's domain name cannot be found | [Details] ${details}\r\n`;
        case 523: return `523 ${host} Total size exceeds maximum size\r\n`;
        case 541: return `541 ${host} Rejected for policy reasons\r\n`;
        case 550: return `550 ${host} Requested action not taken: mailbox unavailable\r\n`;
        case 552: return `552 ${host} Requested mail action aborted: exceeded storage allocation\r\n`;
        case 553: return `553 ${host} Requested action not taken: mailbox name not allowed\r\n`;
        case 554: return `554 ${host} Transaction failed\r\n`;
    }

    return `${code} No reason given\r\n`;
};