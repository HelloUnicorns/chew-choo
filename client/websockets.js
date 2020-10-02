let HOST = location.origin.replace(/^http/, 'ws')
let ws = new WebSocket(HOST);
export let event_handlers = {
    'time': handle_time_message
};

function handle_time_message(event) {
    document.getElementById('server-time').innerHTML = 'Server time: ' + event.time;
}

export function send_event(event) {
    if (ws.readyState !== WebSocket.OPEN) {
        return;
    }
    ws.send(JSON.stringify(event));
 }

ws.onmessage = (event_obj) => {
    let event = JSON.parse(event_obj.data);
    if (event.type in event_handlers) {
        event_handlers[event.type](event);
    }
};
