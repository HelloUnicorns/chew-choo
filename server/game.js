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
    for (var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

wss.on('connection', (client) => {
    client.id = makeid(ID_LEN);
    route_id = map.new_player(client.id);
    if (route_id == undefined) {
        console.log('Error');
        return;
    }
    client.route_id = route_id;
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
        if (message.type == 'speed_change') {
            map.update_speed_change(client.route_id, message.value);
        }
        if (message.type == 'latency_update') {
            let latency = (new Date().getTime() - message.prev_server_time) / 2;
            client.send(JSON.stringify({latency: latency, type: 'latency'}));
        }
    });
});

setInterval(() => {
    wss.clients.forEach((client) => {
        client.send(JSON.stringify({time_str: new Date().toTimeString(), time: new Date().getTime(), type: 'time'}));
    });
}, 1000);

/* Position */
setInterval(() => {
    map.update_map();
    let locations = {};
    for (const [route_id, route] of Object.entries(map.map)) {
        if (!route.player.killed) {
            locations[route_id] = {
                position_in_route: route.player.position_in_route,
                position_fraction: route.player.position_fraction,
                length: route.player.length,
                speed: route.player.speed
            };
        }
    }
    wss.clients.forEach((client) => {
        if (!client.initialized) {
            return;
        }

        client.send(JSON.stringify({ locations, type: 'position'}));
    });
}, 1000 / 60);

/* Kills */
setInterval(() => {
    map.detect_collisions();
    let kills = [];
    for (const [route_id, route] of Object.entries(map.map)) {
        if (route.player.killed && !route.player.kill_notified) {
            kills.push({killee: route_id, killer: route.player.killer});
        }
    }

    if (kills.length == 0) {
        return;
    }

    wss.clients.forEach((client) => {
        if (!client.initialized) {
            return;
        }
        
        /* Update kills */
        client.send(JSON.stringify({kills, type: 'kill'}));
        let player = map.map[client.route_id].player;
        if (player.killed && !player.kill_notified) {
            map.delete_player(client.id);
        }

        /* Update tile changes */
        let routes = [];
        kills.forEach((kill) => {
            routes.push({
                route_id: kill.killer,
                tiles: map.map[kill.killer].tiles
            });
            routes.push({
                route_id: kill.killee,
                tiles: [] // Empty list
            });
        });
        client.send(JSON.stringify({routes, type: 'route_update'}));
    });

    /*for (let kill of kills) {
        map.map[kill.killed].player.kill_notified = true;
    }*/


}, 1000 / 60);
