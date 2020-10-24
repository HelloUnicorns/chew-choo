const { Train } = require('./train.js');
const { Track } = require('./track.js');
const { advance_train, position_mod } = require('../common/position.js');

export class Route {
     constructor(server_time, new_route, is_own) {
         this.is_own = is_own;
         this.route_id = new_route.id;
         this.active_tracks = [];
         this.connector_track = undefined; /* used for connecting the last leftover track to the first regular track. */
         this.next_track = undefined;
         this.tracks = [];
         this.leftover_tracks = [];
         this.speed = 0;
         this.train = new Train(is_own, new_route.train, this.route_id);
         this.drawn = false;
         this.update_route(new_route.tracks, new_route.train.latest_speed_update);
         this.update(server_time);
     }

     remove_tracks() {
        this.tracks.concat(this.leftover_tracks).forEach(track => track.remove());
        if (this.connector_track) {
            this.connector_track.remove();
        }
        this.tracks = [];
        this.leftover_tracks = [];
        this.connector_track = undefined;
     }

     remove() {
         this.remove_train();
         this.remove_tracks();
     }


     remove_train() {
        if (this.train) {
            this.train.remove();
            this.train = undefined;
        }
    }
    
    update(server_time) {
        const { end_position, end_speed, used_tracks, leftover_trailing_tracks } = advance_train(
            server_time - this.latest_speed_update.update_time, this.latest_speed_update, this.train.length, 
            this.tracks, this.leftover_tracks);
        leftover_trailing_tracks.forEach(track => track.fade_out());
        if (leftover_trailing_tracks.length == this.leftover_tracks.length && this.connector_track) {
            this.connector_track.fade_out();
        }
        this.active_tracks = used_tracks;
        let all_tracks = this.leftover_tracks.concat(this.tracks);
        let next_track_index = position_mod(all_tracks.indexOf(this.active_tracks[this.active_tracks.length - 1]) + 1, this.tracks.length, this.leftover_tracks.length);
        this.next_track = all_tracks[next_track_index];
        
        this.speed = end_speed;
        this.train.update(this.active_tracks, this.next_track, end_position % 1);

        if (!this.drawn) {
            this.draw();
            this.drawn = true;
        }
    }

    draw_tracks() {
        for (let track of this.tracks) {
            track.draw();
        }
        for (let track of this.leftover_tracks) {
           track.draw();
        }
        if (this.connector_track) {
            this.connector_track.draw();
        }
     }

     draw() {
        this.draw_tracks();
        this.train.draw(this.active_tracks);
     }

     get score() {
        return this.tracks.length;
     }

     update_route(tracks, latest_speed_update) { 
        this.remove_tracks();
        this.tracks = Track.from_server_new_tracks(tracks.tracks, this.is_own, this.is_own ? 0x8ac466 : 0x8ac466);
        this.leftover_tracks = Track.from_server_new_tracks(tracks.leftover_tracks, this.is_own, this.is_own ? 0x8ac466 : 0x755753);
        this.connector_track = Track.create_connector_track(this.tracks, this.leftover_tracks, this.is_own ? 0x668ac4 : 0x3cbda9);
        this.update_latest_speed_update(latest_speed_update);
        this.drawn = false;
     }

     update_latest_speed_update(latest_speed_update) {
        this.latest_speed_update = latest_speed_update;
     }
 }
