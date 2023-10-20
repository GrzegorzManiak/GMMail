import { ICustomParser, ICustomParserNeeds, ICustomParserReturnType, IParsedParser } from '../extensions/types';



// -- These are the regex's for the different types
//    that we support
const string_regex = ` {0,1}= {0,1}([\\s\\d\\w]+)`;
const number_regex = ` {0,1}= {0,1}([0-9]+)`;
const boolean_regex = ` {0,1}= {0,1}(true|false)`;
const none_regex = `() {0,}`;



/**
 * @name CommandParaser
 * @description Parses a string and returns the command and paramaters or
 * throws an error if the command is invalid
 * 
 * @param {string} command - The command to parse
 * @param {string} raw_data - The raw data to parse
 * @param {ICustomParser} parser_options - The parser options
 * 
 * @returns {IParsedParser | [number, string]} The parsed command and paramaters or an error code and message
 */
export default function parse_command(
    command: string, 
    raw_data: string,
    parser_options: ICustomParser
): IParsedParser | [number, string] {

    // -- Map to store the paramaters and their types
    const paramaters: IParsedParser = new Map();



    // -- Process the command
    let command_regex = `^${command}: {0,1}`;
    for (const key in parser_options) {

        // -- Get the paramater
        const { need, type } = get_paramater(key, parser_options);

        // -- Construct the regex
        const regex = select_regex_string(type);
        let regex_exp = `(?=.*?((${key})${regex}))`;
        if (need === 'OPTIONAL') regex_exp += '';
        command_regex += regex_exp;

        // -- Insert the paramater
        paramaters.set(key, { 
            need, type, data: undefined, raw: '' 
        });
    }



    // -- Cap off the regex expression and execute it
    command_regex += '.*$';
    const regex = new RegExp(command_regex, 'gis'),
        matches = regex.exec(raw_data);


    // -- Ensure that there are matches
    if (!matches) return [501, `Command '${command}' Paramaters is invalid`];
    const parsed_paramaters = [];


    // -- Parse the paramaters
    for (let i = 1; i < matches.length; i += 3) parsed_paramaters.push(
        parse_paramater(matches, i, paramaters, parsed_paramaters));


    // -- Ensure all the required paramaters are present
    const required_present = required_fields_present(parsed_paramaters, parser_options);
    if (!required_present) return [501, `Command '${command}' Paramaters is invalid`];



    // -- Return the paramaters
    return paramaters;
}



/**
 * @name parse_value
 * Parses a value as a specific type
 * 
 * @param {string} value - The value to parse
 * @param {ICustomParserReturnType} type - The type to parse the value as
 * @returns {string | number | boolean | null} The parsed value or null if the value is not of the correct type
 */
const parse_value = (
    value: string, 
    type: ICustomParserReturnType
): string | number | boolean | null => {
    // -- Null if the value is not of the correct type
    if (type === 'none' && value === null) return true;

    switch (type) {
        case 'string': return value;

        case 'number': 
            const parsed = Number(value);
            if (isNaN(parsed)) return null;
            return parsed;

        case 'boolean': 
            return value.toLowerCase() === 'true';

        case 'none': return true;
    }
}



/**
 * @name parse_paramater
 * Parses a paramater and sets the value in the paramaters map.
 * Our regex splits the string into 3 parts, the whole paramater, the name and the value
 * there for we increment by 3 each time.
 * 
 * @param {Array<string>} matches - The matches from the regex
 * @param {number} i - The current index
 * @param {IParsedParser} paramaters - The paramaters map
 * @param {Array<string>} parsed_paramaters - The parsed paramaters
 * 
 * @returns {string} The parsed paramater name or null if the paramater is invalid
 */
const parse_paramater = (
    matches: Array<string>,
    i: number,
    paramaters: IParsedParser,
    parsed_paramaters: Array<string>,
): string => {

    // -- Get the paramater
    const paramater = matches[i],
        paramater_name = matches[i + 1],
        paramater_value = matches[i + 2];


    // -- Get the paramater
    const paramater_data = paramaters.get(paramater_name);
    if (!paramater_data) return null;


    // -- Set the data
    paramater_data.raw = paramater;
    paramater_data.data = parse_value(paramater_value, paramater_data.type);
    parsed_paramaters.push(paramater_name);
    return paramater_name;
}



/**
 * @name select_regex_string
 * Selects the regex string for the given type
 * 
 * @param {ICustomParserReturnType} type - The type to get the regex string for
 * 
 * @returns {string} The regex string
 */
const select_regex_string = (
    type: ICustomParserReturnType
): string => {
    switch (type) {
        case 'string': return string_regex;
        case 'number': return number_regex;
        case 'boolean': return boolean_regex;
        case 'none': return none_regex;
    }
}



/**
 * @name get_paramater
 * Gets the type and need for the paramater by splitting the string at :
 * assuming that you are using typescript, otherwise no error checking
 * 
 * @param {string} paramater - The paramater to get the type and need for eg {"string:REQUIRED
 * @param {ICustomParser} parser_options - The parser options
 *  
 * @returns {ICustomParserReturnType} The type and need for the paramater
 */
const get_paramater = (
    paramater: string,
    parser_options: ICustomParser
) => {
    const [type, need] = parser_options[paramater].split(':') as [ICustomParserReturnType, ICustomParserNeeds];
    return { need, type };
}



/**
 * @name required_fields_present
 * Checks if all the required fields are present
 * 
 * @param {Array<string>} parsed_paramaters - The parsed paramaters
 * 
 * @returns {boolean} True if all the required fields are present, false otherwise
 */
const required_fields_present = (
    parsed_paramaters: Array<string>,
    parser_options: ICustomParser
): boolean => {
    // -- Check if all the required fields are present
    for (const [key, value] of Object.entries(parser_options)) 
        if (value.split(':')[1] === 'REQUIRED' && !parsed_paramaters.includes(key)) 
            return false;

    // -- All required fields are present
    return true;
}