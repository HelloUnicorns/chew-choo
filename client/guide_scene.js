const constants = require('../common/constants.js');

const out_color = "#fffeff"
const over_color = "#00FF3C"

class GuideScene extends Phaser.Scene {
    constructor() {
        super('GuideScene');
    }

    preload() {
        this.load.image('pic', 'assets/menuwallpaper.jpg');
        this.load.image('logo', 'assets/logo.png');
        this.load.audio('menu_music', 'assets/LoveInVain.mp3');
    }

    backMenu() {
        this.scene.stop('GuideScene');
        this.scene.start('MenuScene');
        
    }


    create() {

        this.background = this.add.image(constants.CANVAS_WIDTH / 1.8, constants.CANVAS_HEIGHT / 1.5, "pic");
        this.logo = this.add.sprite(constants.CANVAS_WIDTH / 4, constants.CANVAS_HEIGHT / 8, "logo");

        this.howto = this.add.text(10, constants.CANVAS_HEIGHT / 2.5,  constants.HOW_TO, {
            font: '20px Inconsolata, monospace',
            color: out_color,
            stroke: '#000000',
            strokeThickness: 6
        });

        this.back = this.add.text(10, constants.CANVAS_HEIGHT / 1.15,  "GO BACK", {
            font: '15px Inconsolata, monospace',
            color: out_color,
            stroke: '#000000',
            strokeThickness: 6
        });


        this.backMenu = this.backMenu.bind(this)

        this.back.setInteractive()
            .on('pointerover', () => this.back.setFill(over_color))
            .on('pointerout', () => this.back.setFill(out_color))
            .on('pointerdown', this.backMenu)

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
    GuideScene: GuideScene
}