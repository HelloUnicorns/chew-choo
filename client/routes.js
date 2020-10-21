const { Train } = require('./train.js');
const { Track } = require('./track.js');

export class Route {
     constructor(new_route, is_own) {
         this.is_own = is_own;
         this.route_id = new_route.id;
         this.train = new Train(is_own, new_route.train);
         this.tracks = Track.from_server_new_tracks(new_route.tracks.tracks, is_own);
         this.leftover_tracks = Track.from_server_new_tracks(new_route.tracks.leftover_tracks, is_own);
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
    
    update(server_time) {
        if (this.train) {     
            this.train.update(server_time, this.#active_route);
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
        this.train.draw(this.#active_route);
     }

     get score() {
        return this.tracks.length;
     }

     get #active_route() {
        return (this.leftover_tracks.length) ? this.leftover_tracks : this.tracks;
    }

     update_route(tracks, latest_speed_update) { 
        this.tracks.forEach(track => track.remove());
        this.leftover_tracks.forEach(track => track.remove());
        this.tracks = Track.from_server_new_tracks(tracks.tracks, this.is_own);
        this.leftover_tracks = Track.from_server_new_tracks(tracks.leftover_tracks, this.is_own);
        this.update_latest_speed_update(latest_speed_update);
        this.draw();
     }

     update_latest_speed_update(latest_speed_update) {
         this.train.update_latest_speed_update(latest_speed_update);
     }
 }
