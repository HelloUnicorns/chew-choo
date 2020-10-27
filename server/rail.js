const _ = require('lodash');
const constants = require('../common/constants.js');
const { position_mod } = require('../common/position.js')
const { union_tracks, flatten } = require('./union.js')
const assert  = require('assert');


const directions = ['right', 'down', 'left', 'up'];
const corners = ['up-left', 'up-right', 'down-right', 'down-left'];

/*  Rail box is a group of rails which share the same
    grid distance from the center of the map (rail 0).
    
    For example, box #1 contains rail 0
    Box #2: rails 1 - 4
    Box #3: rails 5 - 12
    Box #4: rails 13 - 24
    etc...


    Visually:
    ┌────────────Box 4─────────────┐
    │24       13        14       15│
    │   ┌────────Box 3────────┐    │
    │   │ 12       5        6 │    │
    │   │   ┌────Box 2────┐   │    │
    │23 │   │ 4         1 │   │  16│
    │   │   │   ┌Box 1┐   │   │    │
    │   │ 11│   │  0  │   │ 7 │    │
    │   │   │   └─────┘   │   │    │
    │22 │   │ 3         2 │   │  17│
    │   │   └─────────────┘   │    │
    │   │ 10       9        8 │    │
    │   └─────────────────────┘    │
    │21       20        19       18│
    └──────────────────────────────┘

    The maximum rail id in each box can be calculated using the following formula:
    x = 2(n-1)n
    Where x is the rail id and n is the box id.
    We can therefore calculate the box id of any rail, even if it is not the maximum one:
        ⌈  (1 + sqrt(1 + 2x))  ⌉
    n = │ ───────────────────  │
        │          2           │


    We use 1-based index to generalize the position of a rail in a given box.
    for example in box #3:
    ┌──────────────────────Box 3──────────────────────┐
    │                                                 │
    │ index(12)=8       index(5)=1        index(6)=2  │
    │                                                 │
    │ index(11)=7                         index(7)=3  │
    │                                                 │
    │ index(10)=6       index(9)=5        index(8)=4  │
    │                                                 │
    └─────────────────────────────────────────────────┘
    The function "rail" is the inverse function of the "index" function described above.

    The size of a given box is the number of rails it contains.
    For example, the size of box #3 is 8, since it has 8 rails in it.

    The middle index of a box is the index of the rail in the bottom right corner.
    Its formula: size / 2

    Sometimes, it's useful to use negative index intead of the 1-based index presented above.
    We call this type of indexing "zero index".
    In zero indexing, the rail in the top left corner of the box has zero index #0.
    Starting at zero index #0, going clockwise increases the index, and going counter clockwise decreases it.
    The middle index can be both positive or negative.

    The function "zero_index", takes a 1-based index and converts it to the its zero index counterpart.
    For example:
    ┌─────────────────────────────Box 3──────────────────────────────┐
    │                                                                │
    │ zero_index(8)=0        zero_index(1)=1        zero_index(2)=2  │
    │                                                                │
    │ zero_index(7)=-1                              zero_index(3)=3  │
    │                                                                │
    │ zero_index(6)=-2       zero_index(5)=-3       zero_index(4)=±4 │
    │                                                                │
    └────────────────────────────────────────────────────────────────┘

*/
class RailBox {
    constructor(box_id) {
        this.id = box_id;

        /* Amount of rails in this box */
        this.size = this.#calc_size();

        /* Rail with the highest id in this box */
        this.max = this.#calc_max_rail();

        /* Rail with the lowest id in this box */
        this.min = this.max - this.size + 1;
    }

    /* Get zero-based index from 1 based index.
       Maximum index returns index 0,
       Maximum index - 1 returns index -1
       Maximum index - n returns index -n as long as it's bigger than the middle index

       If inclusive is set, the middle index (size / 2) also becomes negative */
    zero_index(index, inclusive=false) {
        let fixed_index = (index - 1) % this.size + 1;
        return fixed_index + (inclusive ? 1 : 0) > this.size / 2 ? fixed_index - this.size : index;
    }

    /*  Get rail by index, the index can be bigger than the size of the rail - in this case we perform a wrap around.
        Indices returned from zero_index function are also accepted */ 
    rail(index) {
        return index < 1 ? (this.max + index) : (this.min + (index - 1) %  (this.max - this.min + 1));
    }

    /*
       Return box with id + 1
       For example, if this is box 10, the next box is 1
    */
    next() {
        return boxes[this.id + 1];
    }
    
    /*
        Return box with id - 1
        For example, if this is box 10, the previous box is 9
    */
    previous() {
        return boxes[this.id - 1];
    }

    #calc_size = () => {
        return (4 * (this.id - 1)) || 1;
    }

    #calc_max_rail = () => {
        return 2 * this.id * (this.id - 1);
    }

    static rail_to_box(rail_id) {
        /* let n be box id, x be rail id:
           x ≈ 2(n-1)n ====> n ≈ (1 + sqrt(1 + 2x)) / 2 */
        let box_id = Math.ceil((1 + Math.sqrt(1 + 2 * rail_id)) / 2);
        return boxes[box_id];
    }
}

class Rail {
    constructor(rail_id, crossings=undefined) {
        this.id = rail_id;

        let start_position = rail_start_positions[this.id];
        this.tracks = build_rectangular_rail(start_position.x, start_position.y, constants.TRACK_WIDTH, constants.TRACK_HEIGHT);
        this.leftover_tracks = [];
        this.crossings = {};
        this.dead_crossings = [];
        this.merged_rail_ids = [];

        if (crossings) {
            /* Crossings already exist */
            for (const crossing of crossings) {
                if (crossing.original_rail_id != this.id) {
                    continue;
                }

                crossing.rail_id = this.id;
                crossing.occupied = false;

                this.crossings[crossing.x] = this.crossings[crossing.x] || {};
                this.crossings[crossing.x][crossing.y] = crossing;
            }
        } else {
            /* Construct crossings */
            for (let crossing of crossing_positions) {
                let neighbor_rail_id = this.#get_neighbor(crossing.corner);
                if (!rails[neighbor_rail_id]) {
                    /* The rail is not built */
                    continue;
                }

                let x = start_position.x + crossing.x;
                let y = start_position.y + crossing.y;

                let current_crossing = {
                    rail_id: this.id,
                    original_rail_id: this.id,
                    x,
                    y,
                    neighbor: undefined,
                    occupied: false,
                };

                let neighbor_rail = rails[neighbor_rail_id];
                let neighbor_crossing = {
                    rail_id: neighbor_rail_id,
                    original_rail_id: neighbor_rail_id,
                    x,
                    y,
                    neighbor: undefined,
                    occupied: false,
                };

                current_crossing.neighbor = neighbor_crossing;
                neighbor_crossing.neighbor = current_crossing;

                this.crossings[x] = this.crossings[x] || {};
                neighbor_rail.crossings[x] = neighbor_rail.crossings[x] || {};

                this.crossings[x][y] = current_crossing;
                neighbor_rail.crossings[x][y] = neighbor_crossing;
            }
        }
    }

    occupy(active_tracks) {
        this.tracks.concat(this.leftover_tracks).forEach(track => this.#free_position(track.x, track.y));
        return active_tracks.map(track => this.#occupy_position(track.x, track.y)).filter(rail_id => rail_id != undefined);
    }

    #occupy_position(x, y) {
        if (!this.crossings[x] || !this.crossings[x][y]) {
            return;
        }

        let crossing = this.crossings[x][y];
        crossing.occupied = true;

        assert(crossing.neighbor.x == crossing.x && crossing.neighbor.y == crossing.y);

        if (crossing.neighbor.occupied) {
            return { rail_id: crossing.neighbor.rail_id, coordinates : { x, y } };
        }

        return;
    }

    #free_position(x, y) {
        if (!this.crossings[x] || !this.crossings[x][y]) {
            return undefined;
        }

        let crossing = this.crossings[x][y];
        crossing.occupied = false;
    }

    merge(merged_rail, position, train_length) {
        let update = union_tracks(this, merged_rail, position, train_length);

        let consume_suspects = [];

        /* First let's kill all new dead crossings */
        for (const crossing of update.dead_crossings) {
            rails[crossing.rail_id].kill_crossing(crossing.x, crossing.y);
            if (crossing.rail_id != this.id  && crossing.rail_id != merged_rail.id) {
                consume_suspects.push(crossing.rail_id);
            }
        }

        /* Then we collect the dead crossings from the merged rail */
        this.dead_crossings.push(...merged_rail.dead_crossings);

        /* We then update the new crossings of the merger rail */
        flatten(update.crossings).forEach(crossing => crossing.rail_id = this.id);
        this.crossings = update.crossings;

        /* OPTIONAL: check all of the non dead crossings are now owned by the merger */
        flatten(merged_rail.crossings).forEach((crossing) => assert(this.has_crossing(crossing.x, crossing.y)));

        /* Update tracks */
        this.tracks = update.tracks;
        this.leftover_tracks = update.leftover_tracks;

        /* Update merged rail ids */
        this.merged_rail_ids.push(merged_rail.id, ...merged_rail.merged_rail_ids);
        assert(new Set(this.merged_rail_ids).size === this.merged_rail_ids.length);

        console.log(`Rail ${merged_rail.id} got merged with ${this.id}`);
        merged_rail.empty();

        /* Now we check if a rail does not have crossing and consume it */
        consume_suspects = [...new Set(consume_suspects)];
        let consumed = this.#handle_consume(consume_suspects);

        return {position: update.position, old_rails: consumed.concat(merged_rail.id)};
    }

    separate() {
        /* Achieve list of rails to re-initialize */
        let new_rails = this.merged_rail_ids;
        assert([...new Set(new_rails)].length === new_rails.length);

        new_rails.push(this.id);

        /* Get all crossings */
        let all_crossings = {};
        for (const crossing of this.dead_crossings) {
            all_crossings[crossing.original_rail_id] = all_crossings[crossing.original_rail_id] || [];
            all_crossings[crossing.original_rail_id].push(crossing);
        }

        for (const crossing of flatten(this.crossings)) {
            all_crossings[crossing.original_rail_id] = all_crossings[crossing.original_rail_id] || [];
            all_crossings[crossing.original_rail_id].push(crossing);
        }

        /* Rebuild rail */
        for (const rail_id of new_rails) {
            rails[rail_id] = new Rail(rail_id, all_crossings[rail_id])
        }

        return new_rails;
    }

    is_isolated() {
        return Object.keys(this.crossings).length > 0;
    }

    has_crossing(x, y) {
        return (this.crossings[x] && this.crossings[x][y]) != undefined;
    }

    empty() {
        this.tracks = [];
        this.leftover_tracks = [];
        this.crossings = {};
        this.dead_crossings = [];
        this.merged_rail_ids = [];
    }

    kill_crossing(x, y, report_neighbor=true) {
        if (!this.has_crossing(x, y)) {
            return;
        }

        let crossing = this.crossings[x][y]

        this.dead_crossings.push(crossing);

        delete this.crossings[x][y];
        if (Object.keys(this.crossings[x]).length == 0) {
            delete this.crossings[x];
        }

        if (report_neighbor) {
            /* Avoid infinite mutual recursion by passing report_neighbor=false */
            rails[crossing.neighbor.rail_id].kill_crossing(x, y, report_neighbor=false);
        }
    }

    get all_tracks() {
        return this.leftover_tracks.concat(this.tracks);
    }

    track_by_position(position) {
        return this.all_tracks[Math.floor(position_mod(position, this.tracks.length, this.leftover_tracks.length))];
    }

    coordinates_by_position(position, use_fraction=true) {
        let fraction = use_fraction ? (position % 1) : 0;
        let first_track = this.track_by_position(position);
        let second_track = this.track_by_position(position + 1);

        return { 
            x: first_track.x * (1 - fraction) + second_track.x * fraction, 
            y: first_track.y * (1 - fraction) + second_track.y * fraction, 
        };
    }

    get_neighbor_ids(degree=1) {
        if (degree <= 0) {
            return this.id;
        }

        let first_neighbors = corners.map(corner => this.#get_neighbor(corner));
        return [...new Set(first_neighbors.map(id => rails[id].get_neighbor_ids(degree - 1)).concat(this.id).flat())];
    }

    #handle_consume = (consume_suspects) => {
        let consumed = [];
        for (const suspect_id of consume_suspects) {
            let rail = rails[suspect_id];
            if (rail.id == this.id || rail.is_isolated()) {
                continue;
            }
            
            /* OM NOM NOM */
            this.merged_rail_ids.push(rail.id, ...rail.merged_rail_ids);
            this.dead_crossings.push(...rail.dead_crossings);
            
            /*  
                * Crossings are not handled since the consumed rail has no crossings.
                * Tracks and leftover tracks are not handled since the consumed rail does not change the consumer rail.
            */

            consumed.push(rail.id);
            console.log(`Rail ${rail.id} got consumed by ${this.id}`);
            
            rail.empty();
        }

        return consumed;
    }

    #get_neighbor = (corner) => {
        let box = RailBox.rail_to_box(this.id);

        // Index of the rail in the box, 1-based
        let idx = (this.id - (box.min - 1));

        switch (corner) {
            case 'up-right':
                if (idx % box.size <= box.size / 2)
                    /* Rail found in next box */
                    return box.next().rail(idx % box.size + 1);

                /* Rail found in the prev box */
                return box.previous().rail(box.zero_index(idx) + 1);

            case 'down-right':
                /* Rail found in next box */
                if ((idx - (box.id - 1) + box.size) % box.size <= box.size / 2)
                    return box.next().rail(idx + 1 + (box.id > 1 ? 1 : 0));

                /* Rail found in the prev box */
                return box.previous().rail(box.zero_index(idx));

            case 'down-left':
                 /* Rail found in next box */
                if (idx >= box.size / 2)
                    return box.next().rail(box.zero_index(idx, true) - 1);

                /* Rail found in the prev box */
                return box.previous().rail(idx - 1);

            case 'up-left':
                /* Rail found in next box */
                if ((idx + (box.id - 1)) % box.size <= box.size / 2)
                    return box.next().rail(box.zero_index(idx));

                /* Rail found in the prev box */
                return box.previous().rail(idx - 2);
        }

        throw new Error(`Cannot find ${corner} corner of rail ${this.id}`);
    }

    new_tracks_for_event() {
        let tracks_clone = _.cloneDeep(this.tracks);
        return {
            tracks: _.cloneDeep(this.tracks),
            leftover_tracks: _.cloneDeep(this.leftover_tracks),
        }
    }
}

function get_start_positions() {
    /*  60      41      42      43      44      45
            40      25      26      27      28
        59      24      13      14      15      46
            39      12      5       6       29
        58      23      4       1       16      47
            38      11      0       7       30
        57      22      3       2       17      48
            37      10      9       8       31
        56      21      20      19      18      49
            36      35      34      33      32            
        55      54      53      52      51      50
    */
    let start_positions = [];
    start_positions.push({x: constants.START_X, y: constants.START_Y});

    let direction = directions[0];
    let count = 1;
    let current_count = 1;

    for (let i = 1; i < constants.NUMBER_OF_TRAINS; i++) {
        last = start_positions[i - 1];
        switch (direction) {
            case 'right':
                if (current_count == count) {
                    y = last.y - constants.TRACK_HEIGHT * 2 / 3;
                    x = last.x + constants.TRACK_WIDTH * 2 / 3;
                } else {
                    y = last.y;
                    x = last.x + (constants.TRACK_WIDTH * 2 / 3) * 2;
                }
                break;
            case 'down':
                x = last.x;
                y = last.y + (constants.TRACK_HEIGHT * 2 / 3)  * 2;
                break;
            case 'left':
                x = last.x - (constants.TRACK_WIDTH * 2 / 3)  * 2;
                y = last.y;
                break;
            case 'up':
                x = last.x;
                y = last.y - (constants.TRACK_HEIGHT * 2 / 3)  * 2;
                break;
        }
        start_positions.push({
            x,
            y
        });
        current_count -= 1;
        if (current_count == 0) {
            direction = directions[(directions.indexOf(direction) + 1) % (directions.length)];
            if (direction == 'right') {
                count += 1;
            }
            current_count = count;
        }
    }
    return start_positions;
}

function get_crossing_positions() {
    /*
    computing positional distance (distance between two tracks in position units)

                ||                  ||
        ==S=====A0==================B0========
        ||      ||                  ||      ||
    ====B3========                  ========A1====
        ||                                  ||
    ====A3========                  ========B1====
        ||      ||                  ||      ||
        ========B2==================A2========

    S = (1) + (0) //  This is the first track in the rail
    distance(S, A0) = (constants.TRACK_WIDTH / 3 - 2) + (0)
    
    distance(A0, B0) = distance(A2, B2) = (constants.TRACK_WIDTH / 3 + 1) + (0)
    distance(A1, B1) = distance(A3, B3) = (0) + (constants.TRACK_HEIGHT / 3 + 1)
    
    distance(B_n, A_(n+1)) = (constants.TRACK_WIDTH / 3 - 1) + (constants.TRACK_HEIGHT / 3 - 1)
     */

    
    let S = {
        x: 1,
        y: 0,
        position_in_rail: 0
    };

    let crossings = [];
    let len = 0;

    len = crossings.push({
        x: S.x + (constants.TRACK_WIDTH / 3 - 2),
        y: S.y + (0),
        corner: corners[Math.floor((len + 1) / 2) % corners.length]
    }); // A0

    len = crossings.push({
        x: crossings[len - 1].x + (constants.TRACK_WIDTH / 3 + 1),
        y: crossings[len - 1].y + (0),
        corner: corners[Math.floor((len + 1) / 2) % corners.length]
    }); // B0

    len = crossings.push({
        x: crossings[len - 1].x + (constants.TRACK_WIDTH / 3 - 1),
        y: crossings[len - 1].y + (constants.TRACK_HEIGHT / 3 - 1),
        corner: corners[Math.floor((len + 1) / 2) % corners.length]
    }); // A1

    len = crossings.push({
        x: crossings[len - 1].x + (0),
        y: crossings[len - 1].y + (constants.TRACK_HEIGHT / 3 + 1),
        corner: corners[Math.floor((len + 1) / 2) % corners.length]
    }); // B1

    len = crossings.push({
        x: crossings[len - 1].x - (constants.TRACK_WIDTH / 3 - 1),
        y: crossings[len - 1].y + (constants.TRACK_HEIGHT / 3 - 1),
        corner: corners[Math.floor((len + 1) / 2) % corners.length]
    }); // A2

    len = crossings.push({
        x: crossings[len - 1].x - (constants.TRACK_WIDTH / 3 + 1),
        y: crossings[len - 1].y - (0),
        corner: corners[Math.floor((len + 1) / 2) % corners.length]
    }); // B2

    len = crossings.push({
        x: crossings[len - 1].x - (constants.TRACK_WIDTH / 3 - 1),
        y: crossings[len - 1].y - (constants.TRACK_HEIGHT / 3 - 1),
        corner: corners[Math.floor((len + 1) / 2) % corners.length]
    }); // A3

    len = crossings.push({
        x: crossings[len - 1].x + (0),
        y: crossings[len - 1].y - (constants.TRACK_HEIGHT / 3 + 1),
        corner: corners[Math.floor((len + 1) / 2) % corners.length]
    }); // B3

    for (const [index, c] of crossings.entries()) {
        if (index == 0) {
            c.position_in_rail = S.position_in_rail + Math.abs(c.x - S.x) + Math.abs(c.y - S.y);
            continue;
        }

        let pc = crossings[index - 1]; // previous crossing
        c.position_in_rail = pc.position_in_rail + Math.abs(c.x - pc.x) + Math.abs(c.y - pc.y);
    }

    return crossings;
}

function get_boxes() {
    let _boxes = {};
    let current_box = 1;
    let current_rail = 0;
    while (current_rail < constants.NUMBER_OF_TRAINS) {
        _boxes[current_box] = new RailBox(current_box);
        current_rail = _boxes[current_box].max + 1;
        current_box += 1;
    }

    // Do once again to calculate the next box of the most external box in tha map
    _boxes[current_box] = new RailBox(current_box);

    return _boxes;
}

function build_rectangular_rail(grid_x, grid_y, width, height) {
    let rail = [];
    for (let i = 1; i < width - 1; i++) {
        rail.push({x: grid_x + i, y: grid_y, direction: constants.Direction.LEFT_TO_RIGHT});
    }

    rail.push({x: grid_x + width - 1, y: grid_y, direction: constants.Direction.LEFT_TO_BOTTOM});
    
    for (let i = 1; i < height - 1; i++) {
        rail.push({x: grid_x + width - 1, y: grid_y + i, direction: constants.Direction.TOP_TO_BOTTOM});
    }

    rail.push({x: grid_x + width - 1, y: grid_y + height - 1, direction: constants.Direction.TOP_TO_LEFT});
    
    for (let i = width - 2; i > 0; i--) {
        rail.push({x: grid_x + i, y: grid_y + height - 1, direction: constants.Direction.RIGHT_TO_LEFT});
    }
    
    rail.push({x: grid_x, y: grid_y + height - 1, direction: constants.Direction.RIGHT_TO_TOP});
    
    for (let i = height - 2; i > 0; i--) {
        rail.push({x: grid_x, y: grid_y + i, direction: constants.Direction.BOTTOM_TO_TOP});
    }

    rail.push({x: grid_x, y: grid_y, direction: constants.Direction.BOTTOM_TO_RIGHT});
 
    return rail;
}

function init_rails() {
    for (let i = 0; i < constants.NUMBER_OF_TRAINS; ++i) {
        rails[i] = new Rail(i);
    }
}

function get_rails() {
    return rails;
}


const crossing_positions = get_crossing_positions();
const boxes = get_boxes();
const rail_start_positions = get_start_positions();

let rails = {};

exports.init_rails = init_rails;
exports.get_rails = get_rails;