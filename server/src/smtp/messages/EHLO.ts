import Configuration from '../../config';
import SMTP from '../smtp';

/**
 * @file EHLO.ts
 * @description Static function to get the list of supported features
 * in a format that can be sent to the client
 * 
 * @returns {Array<string>} The list of supported features
 */
export default (
): string[] => {
    const config = Configuration.get_instance(),
        host = config.get<string>('HOST'),
        vendor = config.get<string>('VENDOR'),
        date = new Date();

    // -- Construct the message
    const features = SMTP.get_instance()
        .supported_features.map(feature => '250-' + feature.toUpperCase() + '\r\n');
    features.push('250 HELP\r\n');
    return features;
}