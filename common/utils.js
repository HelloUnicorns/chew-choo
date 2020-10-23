const constants = require('./constants.js');
const assert = require('assert');

const DIRECTION_TO_COMPONENTS = {
    [constants.Direction.BOTTOM_TO_TOP]: { from: 'bottom', to: 'top' },
    [constants.Direction.BOTTOM_TO_LEFT]: { from: 'bottom', to: 'left' },
    [constants.Direction.BOTTOM_TO_RIGHT]: { from: 'bottom', to: 'right' },
    [constants.Direction.TOP_TO_BOTTOM]: { from: 'top', to: 'bottom' },
    [constants.Direction.TOP_TO_LEFT]: { from: 'top', to: 'left' },
    [constants.Direction.TOP_TO_RIGHT]: { from: 'top', to: 'right' },
    [constants.Direction.LEFT_TO_TOP]: { from: 'left', to: 'top' },
    [constants.Direction.LEFT_TO_BOTTOM]: { from: 'left', to: 'bottom' },
    [constants.Direction.LEFT_TO_RIGHT]: { from: 'left', to: 'right' },
    [constants.Direction.RIGHT_TO_LEFT]: { from: 'right', to: 'left' },
    [constants.Direction.RIGHT_TO_TOP]: { from: 'right', to: 'top' },
    [constants.Direction.RIGHT_TO_BOTTOM]: { from: 'right', to: 'bottom' }
};

const COMPONENTS_TO_DIRECTION = {
    'bottom': {
        'top': constants.Direction.BOTTOM_TO_TOP,
        'left': constants.Direction.BOTTOM_TO_LEFT,
        'right': constants.Direction.BOTTOM_TO_RIGHT,
    },
    'left': {
        'top': constants.Direction.LEFT_TO_TOP,
        'bottom': constants.Direction.LEFT_TO_BOTTOM,
        'right': constants.Direction.LEFT_TO_RIGHT,
    },
    'right': {
        'left': constants.Direction.RIGHT_TO_LEFT,
        'top': constants.Direction.RIGHT_TO_TOP,
        'bottom': constants.Direction.RIGHT_TO_BOTTOM,
    },
    'top': {
        'bottom': constants.Direction.TOP_TO_BOTTOM,
        'left': constants.Direction.TOP_TO_LEFT,
        'right': constants.Direction.TOP_TO_RIGHT,
    }
};

function direction_to_direction_components(direction) {
    let components = DIRECTION_TO_COMPONENTS[direction];
    assert(components != undefined, "components can't be undefined");
    return components;
}

function direction_from_direction_components(from, to) {
    let direction = COMPONENTS_TO_DIRECTION[from][to];
    assert(direction != undefined, "direction can't be undefined");
    return direction;
}

exports.direction_to_direction_components = direction_to_direction_components;
exports.direction_from_direction_components = direction_from_direction_components;