const assert = require('assert');
let global_data = require('./global_data.js');
const { ClientMessage, ServerMessage } = require('../common/proto.js');

const HOST = location.origin.replace(/^http/, 'ws');

export class GameSocket {
    constructor(game_scene) {
        this.game_scene = game_scene;
        this.ws = new WebSocket(HOST);
        window.addEventListener('beforeunload', () => this.close());
        this.ws.addEventListener('message', event => this.message_handler(event));
    }

    close() {
        if (this.ws) {
            this.ws.close();
            this.ws = undefined;
        }
    }
    message_handler(message_obj) {
        message_obj.data.arrayBuffer().then(array_buffer => { 
            let message = ServerMessage.decode(Buffer.from(array_buffer,'binary'));
            if (undefined == message.type) {
                debugger;
            }
            if (message.type in this.#message_handlers) {
                this.#message_handlers[message.type](message[message.type]);
            } else {
                this.game_scene.handle_server_message(message.type, message[message.type]);
            }
        });
    }
    
    send_message(message_type, message={}) {
        if (this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        let full_message = {};
        full_message[message_type] = message;
        let err = ClientMessage.verify(full_message);
        if (err) {
            throw Error(err);
        }
        let client_message = ClientMessage.create(full_message);
        assert(client_message.type != undefined, 'message type cannot be undefined!');
        this.ws.send(ClientMessage.encode(client_message).finish());
    }

    #message_handlers = {
        time: (message) => {
            this.send_message('latency_update', {prev_server_time: message.server_time})
        }, 
        latency: (message) => {
            document.getElementById('server-latency').innerHTML = 'Latency: ' + message.latency + ' ms';
            global_data.latency = message.latency;
        }
    }    
}
