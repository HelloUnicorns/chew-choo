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

let client_data = {};

wss.on('connection', (client) => {
    client_data[client] = {
        client_id: makeid(ID_LEN),
        route_id: 0
    };

    console.log(`Client ${client_data[client].client_id} connected`);
    
    let route_id = map.new_player(client_data[client].client_id);
    console.log(`Client ${client_data[client].client_id} occupies route ${route_id}`);
    
    client.send(JSON.stringify({
            client_id: client_data[client].client_id,
            type: 'connection',
            map: map.map,
            route_id: client_data[client].route_id
    }));
    
    client.on('close', () => {
        console.log(`Client ${client_data[client].client_id} disconnected`);
        map.delete_player(client_data[client].client_id);
        delete client_data[client];
    });

    client.on('message', (json_data) => {
        const message = JSON.parse(json_data);
        if (message.type == "speed") {
            map.update_speed(client_data[client].route_id, message.value);
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
        if (!(client in client_data)) {
            return;
        }
        let data = client_data[client];
        let player = map.map[data.route_id].player;
        client.send(JSON.stringify({ position: player.position_in_route, position_fraction: player.position_fraction, type: 'position'}));
    });
}, 1000 / 60);
