const Phaser = require('phaser');
const global_data = require('./global_data.js');
const { event_handlers } = require('./websockets.js');
const constants = require('../common/constants.js');
const { GameScene } = require('./game_scene.js');
const { SpeedMeterScene } = require('./speed_meter_scene.js');
const { set_rails } = require('./rails.js');
const { build_train, get_train_by_id, update_train_location } = require('./train.js');

global_data.player = {
    train: undefined,
    is_speed_up: false,
    is_speed_down: false,
}

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
    for (const route_id in event.map) {
        build_train(Number(route_id));
    }
    global_data.player.train = get_train_by_id(event.route_id);
    global_data.scene.game_inited += 1;
    
    global_data.scene.client_loaded();
};

event_handlers.position = (event) => {
    if (global_data.scene.game_inited != global_data.scene.game_inited_target) {
        return;
    }

    for (let route_id in event.locations) {
        let location_info = event.locations[Number(route_id)];
        update_train_location(route_id, location_info.position_fraction, location_info.position_in_route, location_info.speed);
    }
};

event_handlers.kill = (event) => {
    while(true) {
        alert("You are DEAD");
    }
};
