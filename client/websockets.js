let global_data = require('./global_data.js');

let SERVER = location.origin.replace(/^http/, 'ws')
let ws = undefined;

export function connect_to_server() {
    ws = new WebSocket(SERVER);

    ws.onmessage = (event_obj) => {
        let event = JSON.parse(event_obj.data);
        if (event.type in event_handlers) {
            event_handlers[event.type](event);
        }
    };
}

export let event_handlers = {
    'time': handle_time_message,
    'latency': handle_latency_message
};

function handle_time_message(event) {
    send_event({type: 'latency_update', prev_server_time: event.time});
}

function handle_latency_message(event) {
    document.getElementById('server-latency').innerHTML = 'Latency: ' + event.latency + ' ms';
    global_data.latency = event.latency;
}

export function send_event(event) {
    if (ws.readyState !== WebSocket.OPEN) {
        return;
    }
    ws.send(JSON.stringify(event));
 }
