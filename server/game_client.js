const { performance } = require('perf_hooks');
const { Train } = require('./train.js');
const { Player } = require('./player.js');
const { makeid } = require('../common/id.js');

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

        this.send_connection_event();
    }

    #event_handlers = {
        latency_update : (event) => {
            let latency = (performance.now() - event.prev_server_time) / 2;
            this.send_event({ latency, type: 'latency' });
        }
    }

    send_server_is_full() {
        this.send_event({
            message: 'Server is full',
            type: 'error'
        });
    }

    send_win_event() {
        this.send_event({ type: 'win' });
    }

    handle_close() {
        if (this.removed) {
            console.log(`Removed client ${this.id} disconnected`)
            return;
        }

        console.log(`Client ${this.id} disconnected`);
        this.leave();
    }

    handle_message(json_data) {
        const message = JSON.parse(json_data);

        if (this.removed) {
            return;
        }
        if (message.type in this.#event_handlers) {
            this.#event_handlers[message.type](message);
        } else {
            this.player.handle_event(message.type, message);
        }
    }

    send_connection_event() {
        this.send_event({
            type: 'connection',
            routes: Train.state,
            route_id: this.player.id
        });
    }

    send_event(event) {
        if (this.removed) {
            return;
        }
        this.ws_client.send(JSON.stringify(event));        
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