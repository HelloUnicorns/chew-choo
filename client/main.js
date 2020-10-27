const Phaser = require('phaser');
const constants = require('../common/constants.js');
const { MenuScene } = require('./menu_scene.js');
const { GameScene } = require('./game_scene.js');
const { GameOverlayScene } = require('./game_overlay_scene.js');
const { GameoverScene } = require('./gameover_scene.js');
const { WinScene } = require('./win_scene.js');
const { ErrorScene } = require('./error_scene.js');
const { GuideScene } = require('./guide_scene.js');

new Phaser.Game({
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
    scene: [ MenuScene, GuideScene, GameScene, GameOverlayScene, GameoverScene, WinScene, ErrorScene ]
});
