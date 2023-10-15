import Configuration from '../../config';

export default (): string => {
    const config = Configuration.get_instance(),
        date = new Date();

    return `220 ${config.get<string>('HOST')} ESMTP ${config.get<string>('VENDOR')} Ready at ${date.toUTCString()}\r\n`;
};