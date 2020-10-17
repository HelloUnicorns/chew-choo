let global_data = require('./global_data.js');
const { ClientMessage, ServerMessage } = require('../common/proto.js');

const HOST = location.origin.replace(/^http/, 'ws');

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
        event_obj.data.arrayBuffer().then(array_buffer => { 
            let message = ServerMessage.decode(Buffer.from(array_buffer,'binary'));
            if (message.type in this.event_handlers) {
                this.event_handlers[message.type](message[message.type]);
            } else {
                debugger;
            }
        });
    }
    
    send_event(event_type, event={}) {
        if (this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        let message = {};
        message[event_type] = event;
        let err = ClientMessage.verify(message);
        if (err) {
            throw Error(err);
        }

        this.ws.send(ClientMessage.encode(ClientMessage.create(message)).finish());
    }

    register_event_handler(type, callback) {
        this.event_handlers[type] = callback;
    }

    handle_time_message(event) {
        this.send_event('latency_update', {prev_server_time: event.time});
    }
    
    handle_latency_message(event) {
        document.getElementById('server-latency').innerHTML = 'Latency: ' + event.latency + ' ms';
        global_data.latency = event.latency;
    }
    
}
