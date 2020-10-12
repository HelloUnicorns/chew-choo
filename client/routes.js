export class Route {
     constructor(player_id, train, is_own) {
         this.is_own = is_own;
         this.player_id = player_id;
         this.train = train;
         this.train.set_route(this);
         this.tracks = [];
         this.leftover_tracks = [];
     }

     remove_tracks() {
        for (let track of this.tracks) {
            track.remove();
        }
        this.tracks = [];
     }

     remove() {
         this.remove_train();
         this.remove_tracks();
     }

     remove_train() {
        if (this.train) {
            for (let sprite of this.train.sprites) {
                sprite.destroy();
            }
            if (this.is_own) {
                console.log('removed user train');
            }
            this.train = undefined;
        }
    }
    
    update() {
        if (this.train) {     
            this.train.update();
        }
    }

    draw_tracks() {
        for (let track of this.tracks) {
            track.draw();
        }
        for (let track of this.leftover_tracks) {
           track.draw();
        }
     }

     draw() {
        this.draw_tracks();
        this.train.draw();
     }

     get score() {
        return this.tracks.length;
     }
 }
