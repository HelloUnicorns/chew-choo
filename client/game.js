const Phaser = require('phaser');
const global_data = require('./global_data.js');
const { event_handlers } = require('./websockets.js');
const constants = require('../common/constants.js');
const { GameScene } = require('./game_scene.js');
const { SpeedMeterScene } = require('./speed_meter_scene.js');
const { set_rails } = require('./rails.js');
const { build_train, get_train_by_id, update_server_train_location } = require('./train.js');


const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: constants.CANVAS_WIDTH,
    height: constants.CANVAS_HEIGHT,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 200 }
        }
    },
    scene: [ GameScene, SpeedMeterScene ]
});

event_handlers.connection = (event) => {
    set_rails(event.map);
    global_data.player.train = build_train(event.route_id);
    global_data.scene.game_inited += 1;
    global_data.scene.client_loaded();
};

event_handlers.connection = (event) => {
    set_rails(event.map);
    for (const route_id in event.map) {
        build_train(Number(route_id));
    }
    global_data.player.train = get_train_by_id(event.route_id);
    global_data.scene.game_inited += 1;
    
    global_data.scene.client_loaded();
};

let last_server_time = 0;

event_handlers.position = (event) => {
    if (global_data.scene.game_inited != global_data.scene.game_inited_target) {
        return;
    }
    if (event.server_time < last_server_time) {
        /* a newer update has already arrived */
        console.log('got an out-of-order positions update')
        return;
    }
    last_server_time = event.server_time;
    for (let route_id in event.locations) {
        update_server_train_location(route_id, event.locations[route_id]);
    }
};    
