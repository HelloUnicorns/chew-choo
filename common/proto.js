const protobuf = require("protobufjs/light");
var messages_description = require("../common/jsons/messages.json");
var pb_root = protobuf.Root.fromJSON(messages_description);

exports.ServerMessage = pb_root.lookupType("chewchoo.ServerMessage");
exports.ClientMessage = pb_root.lookupType("chewchoo.ClientMessage");
exports.SpeedType = Object.freeze(pb_root.lookupEnum('chewchoo.SpeedType').values);
