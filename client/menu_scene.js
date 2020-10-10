const constants = require('../common/constants.js');

const out_color = "#fffeff"
const over_color = "#00FF3C"

class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    preload() {
        this.scene.stop('GameOverlayScene');
        this.load.image('pic', 'assets/menuwallpaper.jpg');
        this.load.image('logo', 'assets/logo.png');
        this.load.audio('menu_music', 'assets/LoveInVain.mp3');

    }

    startGame() {
        this.scene.start('GameScene');
        this.scene.start('GameOverlayScene');
        this.scene.stop('MenuScene');
        this.menu_music.stop();
    }


    create() {

        this.menu_music = this.sound.add('menu_music', {
            loop: true
        });

        this.menu_music.play();

        this.background = this.add.image(constants.CANVAS_WIDTH / 1.8, constants.CANVAS_HEIGHT / 1.5, "pic");
        this.logo = this.add.sprite(constants.CANVAS_WIDTH / 4, constants.CANVAS_HEIGHT / 8, "logo");

        this.start = this.add.text(constants.CANVAS_WIDTH / 2.25, constants.CANVAS_HEIGHT / 1.5, 'START', {
            font: '60px Inconsolata, monospace',
            color: out_color,
            stroke: '#000000',
            strokeThickness: 6
        });

        this.startGame = this.startGame.bind(this)
        this.start.setInteractive()
            .on('pointerover', () => this.start.setFill(over_color))
            .on('pointerout', () => this.start.setFill(out_color))
            .on('pointerdown', this.startGame)


        var tween = this.tweens.add({
            targets: this.logo,
            y: '-=16',
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: Infinity
        });

        let scaleX = constants.CANVAS_WIDTH / this.background.width
        let scaleY = constants.CANVAS_WIDTH / this.background.height
        let scale = Math.max(scaleX, scaleY)
        this.background.setScale(scale).setScrollFactor(0)

        this.logo.setOrigin(0, 0);

    }

    update() {
        // if (this.background.fillAlpha < 0.7) {
        //     this.background.fillAlpha += Math.min(0.1, 0.7 - this.background.fillAlpha);
        // }
    }
}

module.exports = {
    MenuScene: MenuScene
}