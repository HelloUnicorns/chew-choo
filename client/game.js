const Phaser = require('phaser');
const global_data = require('./global_data.js');
const { event_handlers } = require('./websockets.js');
const constants = require('../common/constants.js');
const { GameScene } = require('./game_scene.js');
const { GameOverlayScene } = require('./game_overlay_scene.js');
const { GameoverScene } = require('./gameover_scene.js');
const { WinScene } = require('./win_scene.js');
const { set_rails, update_rail } = require('./rails.js');
const { build_train, get_train_by_id, update_server_train_state, remove_train } = require('./train.js');


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
    scene: [ GameScene, GameOverlayScene, GameoverScene, WinScene ]
});

function update_routes(routes) {
    for (let route of routes) {
        update_rail(route.route_id, route.tiles, global_data.player.train.route_id);
        get_train_by_id(route.route_id).position_in_route = 0;
    }
}

event_handlers.connection = (event) => {
    set_rails(event.map);
    for (const route_id in event.map) {
        if ((!event.map[route_id].player.killed)) {
            build_train(Number(route_id), event.map[route_id].player);
        }
    }
    global_data.player.train = get_train_by_id(event.route_id);
    global_data.game_scene.game_inited += 1;
    
    global_data.game_scene.client_loaded();
};

let last_server_time = 0;

event_handlers.position = (event) => {
    if (global_data.game_scene.game_inited != global_data.game_scene.game_inited_target) {
        return;
    }

    update_routes(event.changed_routes);

    if (event.server_time < last_server_time) {
        /* a newer update has already arrived */
        console.log('got an out-of-order positions update')
        return;
    }
    last_server_time = event.server_time;
    for (let route_id in event.locations) {
        update_server_train_state(route_id, event.locations[route_id]);
    }
};

event_handlers.kill = (event) => {
    if (global_data.game_scene.game_inited != global_data.game_scene.game_inited_target) {
        return;
    }

    update_routes(event.routes);

    let kills = event.kills.map(kill => ({
        killed: Number(kill.killed_route_id),
        killer: Number(kill.killer_route_id)
    }));
    let killed = kills.map(kill => kill.killed);
    if (killed.includes(global_data.player.train.route_id)) {
        if (global_data.game_scene.bg_music) {
            global_data.game_scene.bg_music.mute = true;
        }
        game.scene.start('GameoverScene');
        game.scene.stop('GameOverlayScene');
        game.scene.stop('GameScene');    
        return;
    }

    for (let route_id of killed) {
        remove_train(route_id);
    }
};

event_handlers.win = (event) => {
    if (global_data.game_scene.game_inited != global_data.game_scene.game_inited_target) {
        return;
    }

    if (global_data.game_scene.bg_music) {
        global_data.game_scene.bg_music.mute = true;
    }
    game.scene.start('WinScene');
    game.scene.stop('GameOverlayScene');
    game.scene.stop('GameScene');    
};
