import Configuration from '../../config';
import { log } from '../../log';
import greeting from '../messages/greeting';
import Socket from '../socket';




export default class NilSocket extends Socket {
    public constructor() {
        super('NIL', Configuration.get_instance().get<number>('SMTP_PORTS', 'NIL'));
        
        this._socket = Bun.listen({
            hostname: this._config.get<string>('HOST'),
            port: this._port,
            socket: {


              data(socket, data) {
                log('DEBUG', 'Socket', 'constructor', `Socket data received on port ${this._port}: ${data}`);
              }, // message received from client


              open(socket) {
                log('DEBUG', 'Socket', 'constructor', `Socket opened on port ${this._port}`);
                socket.write(greeting());
              }, // socket opened


              close(socket) {
                log('DEBUG', 'Socket', 'constructor', `Socket closed on port ${this._port}`);
              }, // socket closed


              drain(socket) {
                log('DEBUG', 'Socket', 'constructor', `Socket drained on port ${this._port}`);
              }, // socket ready for more data


              error(socket, error) {
                log('ERROR', 'Socket', 'constructor', `Socket error on port ${this._port}: ${error}`);
              }, // error handler


            },
        });
    }
}