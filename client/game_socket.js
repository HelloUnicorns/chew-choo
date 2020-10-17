let global_data = require('./global_data.js');

const HOST = location.origin.replace(/^http/, 'ws');

const protobuf = require("protobufjs/light");
var messages_description = require("../common/jsons/messages.json");
var pb_root = protobuf.Root.fromJSON(messages_description);
var ServerMessage = pb_root.lookupType("chewchoo.ServerMessage");

export class GameSocket {
    constructor() {
        this.ws = new WebSocket(HOST);
        this.event_handlers = {};
        window.addEventListener('beforeunload', () => this.close());    
        this.register_event_handler('time', event => this.handle_time_message(event));
        this.register_event_handler('latency', event => this.handle_latency_message(event));
        this.ws.addEventListener('message', event => this.message_handler(event));
    }

    close() {
        if (this.ws) {
            this.ws.close();
            this.ws = undefined;
        }
    }
    message_handler(event_obj) {
        let event = JSON.parse(event_obj.data);
        if (event.type in this.event_handlers) {
            this.event_handlers[event.type](event);
        }
    }
    send_event(event) {
        if (this.ws.readyState !== WebSocket.OPEN) {
            return;
        }
        this.ws.send(JSON.stringify(event));
     }

    register_event_handler(type, callback) {
        this.event_handlers[type] = callback;
    }

    handle_time_message(event) {
        this.send_event({type: 'latency_update', prev_server_time: event.time});
    }
    
    handle_latency_message(event) {
        let latency_message;
        try {
            let message = ServerMessage.decode(Buffer.from(event.pb, 'base64'));
            latency_message = message[message.server_message];
        } catch (err) {
            console.log('parse error', err)
            return;
        }
        document.getElementById('server-latency').innerHTML = 'Latency: ' + latency_message.latency + ' ms';
        global_data.latency = latency_message.latency;
    }
    
}
