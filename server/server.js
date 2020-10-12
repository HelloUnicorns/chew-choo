const express = require('express');
const compression = require('compression');
const { Server } = require('ws');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const app = express();

app.use(compression())
app.use(express.static('dist'));

const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });


function is_active_client(client) {
    return client.initialized || !client.removed;
}

function get_active_clients() {
    return [...wss.clients].filter(is_active_client);
}

/* Event sending functions */
function send_event(client, event) {
    client.send(JSON.stringify(event));
}

function broadcast_event(event) {
    get_active_clients().forEach((client) => send_event(client, event));
}

exports.wss = wss;
exports.is_active_client = is_active_client;
exports.get_active_clients = get_active_clients;
exports.send_event = send_event;
exports.broadcast_event = broadcast_event;