const constants = require('../common/constants.js');
const { Leaderboard } = require('./leaderboard.js');
const { Speedometer } = require('./speedometer.js');

export class GameOverlayScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverlayScene' });
        this.game_scene = undefined;
        this.leaderboard = new Leaderboard(this);
        this.speedometer = new Speedometer(this);
    }

    preload() {
        this.speedometer.preload();
    }

    create(game_scene) {
        this.game_scene = game_scene;
        this.speedometer.create(); 
        this.leaderboard.create();
    }

    update() {
        if (!this.game_scene.player_route) {
            return;
        }
        this.speedometer.update(this.game_scene.player_route.speed);
        this.leaderboard.update(Object.values(this.game_scene.routes));
    }
}
