import Configuration from '../config';

export default class Message {

    protected _config: Configuration;
    protected readonly _feature: string;

    constructor(
        feature: string,
    ) {
        this._config = Configuration.get_instance();
        this._feature = feature;
    }
}