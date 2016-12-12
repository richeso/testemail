const async = require('async');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const Room = require('../models/Room');
const User = require('../models/User');

var parseAuthHeader = function(req,res) {
	var auth = req.headers['authorization'];  // auth is in base64(username:password)  so we need to decode the base64
	console.log("Authorization Header is: ", auth);
	var tmp = auth.split(' ');   // Split on a space, the original auth looks like  "Basic Y2hhcmxlczoxMjM0NQ==" and we need the 2nd part
	var buf = new Buffer(tmp[1], 'base64'); // create a buffer and tell it the data coming in is base64
	var plain_auth = buf.toString();        // read it back out as a string
	console.log("Decoded Authorization ", plain_auth);
	// At this point plain_auth = "username:password"
	var creds = plain_auth.split(':');      // split on a ':'
	var username = creds[0];
	var password = creds[1];
	console.log("username="+username+ " password="+password);
	return username;
};

exports.testBasicAuth = (req, res, next) => {
	email = parseAuthHeader(req,res);
	User.findOne({ email: email }, (err, user) => {
	    if (err) { return next(err)};  
        res.send(user);
	});
};
exports.findAll = (req, res, next) => {
	Room.find({}, function(err, docs) {
	    if (!err){ 
	        console.log(docs);
	        res.send(docs);
	    } else {
	    	res.send(err);
	    }
	});
    
};

exports.findById = (req, res, next) => {
	var roomid = req.params.id;
	Room.findOne({ roomname: roomid }, (err, room) => {
	    if (err) { res.send(err)};
        res.send(room);
	});
   
};

exports.addRoom = (req, res, next) => {
	var data = req.body;
    var datastr = JSON.stringify(data);
    console.log('Adding Room: ' + datastr);
    const room = new Room({
        roomname: data.roomname,
        secret:  data.secret,
        defaultMap: data.defaultMap,
        players:  data.players,
    });

    room.roomExpires = Date.now() + (6*60*60*1000); // 6 hours
    room.save((err) => {
	      if (err) { return next(err);  }
	      else { res.send(data);}
	} );
};

exports.updateRoom = (req, res, next) => {
      var roomid = req.params.id;
     
	  async.waterfall([
	    function findRoom(done) {
	    	Room.findOne({ roomname: roomid }, (err, room) => {
	    	    if (err) { res.send(err) }
	    	    done(err, room); 
	    	});
	    },
	    function updateit(room, done) {
		    if (room) {
		         var data = req.body;
                 var datastr = JSON.stringify(data);
		        if (data.roomname) room.roomname=data.roomname;
			    if (data.secret) room.secret=data.secret;
			    if (data.defaultMap) room.defaultMap=data.defaultMap;
			    if (data.players) room.players=data.players;
		    	room.save((err) => {
		      		if (err) { return next(err);  }
		      		else { res.send("updated Room: "  + room);}
				});
		    	
		    } else {
		        // New Room - add since it does not exist
		    	var data = req.body;
			    var datastr = JSON.stringify(data);
			    console.log('Adding Room: ' + datastr);
			    const room = new Room({
			        roomname: data.roomname,
			        secret:  data.secret,
			        defaultMap: data.defaultMap,
			        players:  data.players,
			    });
			
			    room.roomExpires = Date.now() + (6*60*60*1000); // 6 hours
			    room.save((err) => {
				      if (err) { return next(err);  }
				      else { res.send(data);}
				} );
		    }
	    }
	  ], (err) => {
	    if (err) { return next(err); }
	    res.send("Deleted:"+room);
	  });
};

exports.deleteByName = (req, res, next) => {
	var roomid = req.params.id;
	Room.findOne({ roomname: roomid }, (err, room) => {
	    if (err) { res.send(err)}
	    else {
	        if (room) {
	    	Room.remove({ _id: room._id }, (err) => {
		    	    if (err) { return next(err); }
		    	    else {
		    	    	res.send("Deleted: " + room);
		    	    }
		    	});
		    } else {
		    	res.send("Room not found: " +roomid);
		    }
	    }
       
	});
	
};

exports.deleteById = (req, res, next) => {
	  var roomid = req.params.id;
	  async.waterfall([
	    function findRoom(done) {
	    	Room.findOne({ roomname: roomid }, (err, room) => {
	    	    if (err) { res.send(err) }
	    	    done(err, room); 
	    	});
	    },
	    function deleteIt(room, done) {
		    if (room) {
		    	Room.remove({ _id: room._id }, (err) => {
		    	    if (err) { return next(err); }
		    	    else {
		    	       res.send("Deleted:"+room);
		    	       }
		    	});
		    	
		    } else {
		    	res.send("Room not found: "+roomid);
		    }
	    }
	  ], (err) => {
	    if (err) { return next(err); }
	    res.send("Deleted:"+room);
	  });
};

exports.addPlayer = (req, res, next) => {
      var roomid = req.params.id;
     
	  async.waterfall([
	    function findRoom(done) {
	    	Room.findOne({ roomname: roomid }, (err, room) => {
	    	    if (err) { res.send(err) }
	    	    done(err, room); 
	    	});
	    },
	    function updateit(room, done) {
		    if (room) {
		        var playerdata = req.body;
		        var playername = playerdata.playername;
                var datastr = JSON.stringify(playerdata);
                //console.log("Input data: "+datastr);
                var players = room.players;
                for(var i in players) {    
        		    var tempname=players[i].playername;
        		    if (tempname == playername) {
        		    	room.players.splice(i, 1);
        		    	break;
        		    }
        	    }
                players.push(playerdata);
		    	room.save((err) => {
		      		if (err) { return next(err);  }
		      		else { res.send("updated Room: "  + room);}
				});
		    	
		    } else {
		        // Room was not found - cannot add Player
		    	res.send("Room not found: "+roomid);
		    }
	    }
	  ], (err) => {
	    if (err) { return next(err); }
	    res.send("Added Player:"+room);
	  });
};

exports.deletePlayer = (req, res, next) => {
      var roomid = req.params.id;
      var playername = req.params.player;
      console.log ("Deleting Player: "+roomid+ ":"+playername);
	  async.waterfall([
	    function findRoom(done) {
	    	Room.findOne({ roomname: roomid }, (err, room) => {
	    	    if (err) { res.send(err) }
	    	    done(err, room); 
	    	});
	    },
	    function updateit(room, done) {
		    if (room) {
		    	var players = room.players;
                for(var i in players) {    
        		    var tempname=players[i].playername;
        		    if (tempname == playername) {
        		    	players.splice(i, 1);
        		    	break;
        		    }
        		    
        	    }
		    	room.save((err) => {
		      		if (err) { return next(err);  }
		      		else { res.send("updated Room: "  + room);}
				});
		    	
		    } else {
		    	 // Room was not found - cannot Delete Player
		    	res.send("Room was not found: "+roomid);
		    }
	    }
	  ], (err) => {
	    if (err) { return next(err); }
	    res.send("Deleted Player:"+room);
	  });
};