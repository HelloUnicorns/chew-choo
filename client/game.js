const Phaser = require('phaser');
const global_data = require('./global_data.js');
const { event_handlers } = require('./websockets.js');
const constants = require('../common/constants.js');
const { GameScene } = require('./game_scene.js');
const { SpeedMeterScene } = require('./speed_meter_scene.js');
const { set_rails } = require('./rails.js');
const { build_train } = require('./train.js');

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
    global_data.player.train = build_train(event.route_id);
    global_data.scene.game_inited += 1;
    
    global_data.scene.client_loaded();
};

event_handlers.position = (event) => {
    if (global_data.scene.game_inited != global_data.scene.game_inited_target) {
        return;
    }
    let own_player_data = event.locations[global_data.player.train.route_id];
    global_data.player.train.position_fraction = own_player_data.position_fraction;
    global_data.player.train.position_in_route = own_player_data.position_in_route;
    global_data.player.train.last_position_update = global_data.scene.time.now;
};    
