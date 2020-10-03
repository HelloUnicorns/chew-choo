const { wss } = require('./server.js');
const map = require('./map.js');

function get_random_tint() {
    return Math.random() * 0xffffff;
}

const ID_LEN = 8;

function makeid(length) {
    /* https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript */
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

wss.on('connection', (client) => {
    client.id = makeid(ID_LEN);
    client.route_id = map.new_player(client.id);
    client.initialized = true;

    console.log(`Client ${client.id} connected`);
    console.log(`Client ${client.id} occupies route ${client.route_id}`);

    client.send(JSON.stringify({
            client_id: client.id,
            type: 'connection',
            map: map.map,
            route_id: client.route_id
    }));
    
    client.on('close', () => {
        console.log(`Client ${client.id} disconnected`);
        map.delete_player(client.id);
    });

    client.on('message', (json_data) => {
        const message = JSON.parse(json_data);
        if (message.type == "speed") {
            map.update_speed(client.route_id, message.value);
        }
    });
});

setInterval(() => {
    wss.clients.forEach((client) => {
        client.send(JSON.stringify({time: new Date().toTimeString(), type: 'time'}));
    });
}, 1000);

setInterval(() => {
    map.update_map();
    
    wss.clients.forEach((client) => {
        if (!client.initialized) {
            return;
        }
        let player = map.map[client.route_id].player;
        
        client.send(JSON.stringify({ killed: player.killed, position: player.position_in_route, position_fraction: player.position_fraction, type: 'position'}));
        if (player.killed) {
            map.delete_player(client.id);
            client.initialized = false;
        }
    });
}, 1000 / 60);
