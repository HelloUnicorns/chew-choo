const Phaser = require('phaser');
const { send_event, event_handlers } = require('./websockets.js');
let game_inited = false;
let emitter;
let client_id;
let emitter_tint;
let other_players_emitters = {};
let particles;

function preload() {
    this.load.image('sky', 'assets/space3.png');
    this.load.image('logo', 'assets/phaser3-logo.png');
    this.load.image('particle', 'assets/particle.png');
}

function create_trail() {
    return particles.createEmitter({
        speed: 100,
        scale: { start: 0.3, end: 0 },
        blendMode: 'ADD'
    });
}

function create() {
    this.add.image(400, 300, 'sky');

    particles = this.add.particles('particle');
    emitter = create_trail();
    
    var logo = this.physics.add.image(400, 100, 'logo');

    logo.setVelocity(100, 200);
    logo.setBounce(1, 1);
    logo.setGravity(0, 100);
    logo.setCollideWorldBounds(true);

    if (emitter_tint) {
        emitter.setTint(emitter_tint);
    }

    game_inited = true;
}

function update() {
    emitter.setPosition(game.input.mousePointer.x, game.input.mousePointer.y);
    send_event({type: 'location', x: game.input.mousePointer.x, y: game.input.mousePointer.y});
}

event_handlers.locations = (event) => {
    if (!game_inited) {
        return;
    }
    let old_other_players_emitters = Object.assign({}, other_players_emitters);
    let new_other_players_emitters = {};

    event.location_info.forEach((info) => {
        if (info.client_id == client_id) {
            return;
        }
        new_other_players_emitters[info.client_id] = old_other_players_emitters[info.client_id] || create_trail();
        new_other_players_emitters[info.client_id].setPosition(info.x, info.y);
        new_other_players_emitters[info.client_id].setTint(info.tint);
        delete old_other_players_emitters[info.client_id];
    });

    other_players_emitters = new_other_players_emitters;

    /* those who were not deleted are players that left */
    for (client_id in old_other_players_emitters) {
        old_other_players_emitters[client_id].remove();
    }
};

event_handlers.connection = (event) => {
    client_id = event.client_id;
    emitter_tint = event.tint;
    if (game_inited) {
        emitter.setTint(emitter_tint);
    }
};

const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 200 }
        }
    },
    scene: {
        preload,
        create,
        update
    },
    
});