const { wss } = require('./server.js');

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

function get_random_tint() {
    return Math.random() * 0xffffff;
}

wss.on('connection', (client) => {
    let client_id = makeid(ID_LEN);
    let data = {
        x: 0,
        y: 0, 
        tint: get_random_tint()
    };

    client_data[client_id] = data;

    console.log(`Client ${client_id} connected`);
    
    client.send(JSON.stringify({client_id, type: 'connection', tint: data.tint}))
    
    client.on('close', () => {
        console.log(`Client ${client_id} disconnected`);
        delete client_data[client_id];
    });

    client.on('message', (json_data) => {
        const message = JSON.parse(json_data);
        if (message.type == "location") {
            client_data[client_id].x = message.x;
            client_data[client_id].y = message.y;
        }
        if (message.type == "switch_tint") {
            data.tint = get_random_tint();
        }
    });
});

setInterval(() => {
    wss.clients.forEach((client) => {
        client.send(JSON.stringify({time: new Date().toTimeString(), type: 'time'}));
    });
}, 1000);

setInterval(() => {
    let location_info = Object.keys(client_data).map(function(client_id) {
        let client_info = client_data[client_id];
        return { client_id, x: client_info.x, y: client_info.y, tint: client_info.tint };
    });
    
    wss.clients.forEach((client) => {
        client.send(JSON.stringify({location_info, type: 'locations'}));
    });
}, 1000 / 60);
