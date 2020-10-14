const { wss } = require('./server.js');
const { performance } = require('perf_hooks');


wss.on('connection', (client) => {
    client.on('message', (json_data) => {
        const message = JSON.parse(json_data);
        if (message.type == 'latency_update') {
            let latency = (performance.now() - message.prev_server_time) / 2;
            client.send(JSON.stringify({ latency: latency, type: 'latency' }));
        }
    });
});

setInterval(() => {
    let current_time = performance.now();
    wss.clients.forEach((client) => {
        client.send(JSON.stringify({ time: current_time, type: 'time' }));
    });
}, 1000 / 10);
