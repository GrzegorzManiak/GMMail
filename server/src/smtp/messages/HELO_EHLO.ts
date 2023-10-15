export default (
    message: string,
): {
    sender_domain: string,
    message_type: 'HELO' | 'EHLO' | 'UNKNOWN',
} => {
    // -- Split the message into an array
    message = message.trim();
    message = message.toUpperCase();
    const message_split = message.split(' ');

    
    // -- This should only be 2 elements long
    if (message_split.length !== 2) return {
        sender_domain: '',
        message_type: 'UNKNOWN',
    }


    // -- Get the sender domain and message type
    const sender_domain = message_split[1],
        message_type = message_split[0] === 'HELO' || message_split[0] === 'EHLO' ? message_split[0] : 'UNKNOWN';


    // -- Return the sender domain and message type
    return {
        sender_domain,
        message_type,
    };
};