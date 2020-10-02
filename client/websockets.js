let HOST = location.origin.replace(/^http/, 'ws')
let ws = new WebSocket(HOST);

ws.onmessage = (event) => {
    document.getElementById('server-time').innerHTML = 'Server time: ' + event.data;
};
