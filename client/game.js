const Phaser = require('phaser');
const { send_event, event_handlers } = require('./websockets.js');
let game_inited = false;
let emitter;
let client_id;
let other_players_emitters = {};
let particles;

function preload() {
    this.load.image('sky', 'assets/space3.png');
    this.load.image('logo', 'assets/phaser3-logo.png');
    this.load.image('red', 'assets/red.png');
}

function create_trail() {
    let trail = particles.createEmitter({
        speed: 100,
        scale: { start: 1, end: 0 },
        blendMode: 'ADD'
    });
    trail.setTint(Math.random() * 0xffffff);
    return trail;
}
function create() {
    this.add.image(400, 300, 'sky');

    particles = this.add.particles('red');
    emitter = create_trail();
    
    var logo = this.physics.add.image(400, 100, 'logo');

    logo.setVelocity(100, 200);
    logo.setBounce(1, 1);
    logo.setCollideWorldBounds(true);
    game_inited = true;
}

function update() {
    emitter.setPosition(game.input.mousePointer.x, game.input.mousePointer.y);
    console.log(emitter);
    send_event({type: 'location', x: game.input.mousePointer.x, y: game.input.mousePointer.y});
}

event_handlers['locations'] = (event) => {
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
        delete old_other_players_emitters[info.client_id];
    });

    other_players_emitters = new_other_players_emitters;

    /* those who were not deleted are players that left */
    for (client_id in old_other_players_emitters) {
        old_other_players_emitters[client_id].remove();
    }
};

event_handlers['connection'] = (event) => {
    client_id = event.client_id;
};

const game = new Phaser.Game({
    type: Phaser.AUTO,
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