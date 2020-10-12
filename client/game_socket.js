let global_data = require('./global_data.js');

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
        document.getElementById('server-latency').innerHTML = 'Latency: ' + event.latency + ' ms';
        global_data.latency = event.latency;
    }
    
}
