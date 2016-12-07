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
    res.json({ username: req.user.username, email: user.email });
};

exports.deleteByName = (req, res, next) => {
	var roomid = req.params.id;
	Room.findOne({ roomname: roomid }, (err, room) => {
	    if (err) { res.send(err)}
	    else {
	    	Room.remove({ _id: room._id }, (err) => {
	    	    if (err) { return next(err); }
	    	    else {
	    	    	res.send("Deleted: " + room);
	    	    }
	    	});
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
	    function deleteIt(user, done) {
	    	Room.remove({ _id: room._id }, (err) => {
	    	    if (err) { return next(err); }
	    	});
	    }
	  ], (err) => {
	    if (err) { return next(err); }
	    res.send("Deleted:"+room);
	  });
};

