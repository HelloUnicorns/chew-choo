const { performance } = require('perf_hooks');
const { Train } = require('./train.js');
const { Player } = require('./player.js');
const { makeid } = require('../common/id.js');
const { ClientMessage, ServerMessage } = require('../common/proto.js');

class GameClient {
    constructor(ws_client, train) {
        this.ws_client = ws_client;
        this.removed = false;
        this.id = makeid();

        if (!train) {
            this.send_server_is_full();
            this.leave();
            console.log('Server is full - refused new client');
            return;
        }

        this.player = new Player(this, train);

        this.ws_client.on('close', () => this.handle_close());
        this.ws_client.on('message', (message) => this.handle_message(message));

        this.send_connection_message();
    }

    #message_handlers = {
        latency_update : (message) => {
            let latency = (performance.now() - message.prev_server_time) / 2;
            this.send_message('latency', {latency});
        }
    }

    send_server_is_full() {
        this.send_message('error', {
            message: 'Server is full'
        });
    }

    send_win_message() {
        this.send_message('win');
    }

    handle_close() {
        if (this.removed) {
            console.log(`Removed client ${this.id} disconnected`)
            return;
        }

        console.log(`Client ${this.id} disconnected`);
        this.leave();
    }

    handle_message(buffer) {
        if (this.removed) {
            return;
        }

        let message = ClientMessage.decode(buffer);
        
        if (message.type in this.#message_handlers) {
            this.#message_handlers[message.type](message[message.type]);
        } else {
            this.player.handle_message(message.type, message[message.type]);
        }
    }

    send_connection_message() {
        this.send_message('connection', {
            routes: Train.state,
            route_id: this.player.id
        });
    }

    send_message(message_type, message={}) {
        if (this.removed) {
            return;
        }
        let full_message = {};
        full_message[message_type] = message;
        let err = ServerMessage.verify(message);
        if (err) {
            throw Error(err);
        }
        this.ws_client.send(ServerMessage.encode(ServerMessage.create(message)).finish());
    }

    leave() {
        if (this.player) {
            this.player.leave();
            this.player = undefined;
        }
        if (this.ws_client) {
            this.ws_client.close();
            this.ws_client = undefined;
        }
        this.removed = true;
    }
}

exports.GameClient = GameClient;