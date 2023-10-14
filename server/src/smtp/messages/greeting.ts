import Configuration from '../../config';

export default (): string => {
    const config = Configuration.get_instance();
    return `220 ${config.get<string>('HOST')} ESMTP ${config.get<string>('VENDOR')} Ready\r\n`;
};