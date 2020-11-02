const constants = require('../common/constants.js');

const LEADERBOARD_FONT = '20px Lucida Console';
const LEADERBOARD_MAX_SIZE = 6;
const TEXT_HEIGHT = 26;
const TOP_MARGIN = 20;
const BOTTOM_MARGIN = 10;
const LEFT_MARGIN = 17;

const BACKGROUND_ALPHA = 0.9;
const BACKGROUND_COLOR = 0xffffff;
const BACKGROUND_MARGIN_FROM_CORNER = 10;
const LEADERBOARD_WIDTH = 210;
const HEADER_HEIGHT = 55;

class LeaderboardItem {
    constructor(leaderboard) {
        this.leaderboard = leaderboard;
        this.text = undefined;
    }

    create(x, y) {
        this.text = this.leaderboard.scene.add.text(x, y, '', { font: LEADERBOARD_FONT });
    }

    update(name, score, rank, is_own) {
        this.text.setText(`${rank}.${name}:`.padEnd(13) + `${score}`);
        this.text.setFill(is_own ? '#00cc00' : '#cc0000');
    }

    hide() {
        this.text.setText('');
    }
}

export class Leaderboard {
    constructor(scene) {
        this.scene = scene;
        this.background = undefined;
        this.leaderboard_items = [];
        for (var i = 0; i < LEADERBOARD_MAX_SIZE; i++) {
            this.leaderboard_items.push(new LeaderboardItem(this));
        }
        this.remaining_players_text = undefined;
        this.leaderboard_background = undefined;
    }
    
    create() {
        this.leaderboard_background = this.scene.add.rectangle(
            constants.CANVAS_WIDTH - LEADERBOARD_WIDTH - BACKGROUND_MARGIN_FROM_CORNER,
            BACKGROUND_MARGIN_FROM_CORNER, 
            LEADERBOARD_WIDTH,
            0, 
            BACKGROUND_COLOR, 
            BACKGROUND_ALPHA);
        this.leaderboard_background.setOrigin(0);
        let x = this.leaderboard_background.x + LEFT_MARGIN;
        this.remaining_players_text = this.scene.add.text(x, this.leaderboard_background.y + TOP_MARGIN, '', { font: LEADERBOARD_FONT, fill: '#000000' });
        this.remaining_players_text.setOrigin(0);
        this.leaderboard_items.forEach((item, i) => item.create(x, this.leaderboard_background.y + HEADER_HEIGHT + TEXT_HEIGHT * i));
    }
    
    update(routes) {
        this.remaining_players_text.setText(`Remaining: ${routes.length}`);

        let leaderboard_info = routes.map(route => ({ name: route.route_id, score: route.score, is_own: route.is_own }));
        leaderboard_info.sort((info_a, info_b) => { return info_b.score - info_a.score });
        leaderboard_info.forEach((info, idx) => { 
            info.rank = idx + 1;
        });

        let leaderboard_top = leaderboard_info.slice(0, this.leaderboard_items.length);
        let player_index = leaderboard_info.findIndex(info => info.is_own);
        /* make sure the current player is always in the leaderboard */
        if (player_index >= leaderboard_top.length) {
            leaderboard_top[leaderboard_top.length - 1] = leaderboard_info[player_index];
        }

        leaderboard_top.forEach((leader, i) => {
            this.leaderboard_items[i].update(leader.name, leader.score, leader.rank, leader.is_own);
        })

        /* hide irrelevant items */
        for (let i = leaderboard_top.length; i < this.leaderboard_items.length; i++) {
            this.leaderboard_items[i].hide();
        }
        
        this.leaderboard_background.height = HEADER_HEIGHT + TEXT_HEIGHT * leaderboard_top.length + BOTTOM_MARGIN;
    }
}