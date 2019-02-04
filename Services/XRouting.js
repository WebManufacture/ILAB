function XRoutingPacket(type) {
    this._type = type;
}

XRoutingPacket.prototype = {
    
};

XRoutingPacket.fromBytes = function (buffer) {

};

XRoutingPacket.TYPE_HI       = {};
XRoutingPacket.TYPE_INFO     = {};
XRoutingPacket.TYPE_SEEYOU   = {};
XRoutingPacket.TYPE_REDIRECT = {};
XRoutingPacket.TYPE_FOLLOW   = {};
XRoutingPacket.TYPE_SEGMENT  = {};
XRoutingPacket.TYPE_STREAM   = {};
XRoutingPacket.TYPE_ON       = {};
XRoutingPacket.TYPE_UN       = {};
XRoutingPacket.TYPE_GET      = {};
XRoutingPacket.TYPE_SET      = {};
XRoutingPacket.TYPE_SEARCH   = {}; //ALL
XRoutingPacket.TYPE_ADD      = {};
XRoutingPacket.TYPE_DEL      = {};
XRoutingPacket.TYPE_CALL     = {};

function XRouter() {

}