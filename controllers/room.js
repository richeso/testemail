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
    res.json({ username: req.user.username, email: user.email });
};

exports.findById = (req, res, next) => {
    res.json({ username: req.user.username, email: user.email });
};

exports.addRoom = (req, res, next) => {
    res.json({ username: req.user.username, email: user.email });
   
};

exports.updateRoom = (req, res, next) => {
    res.json({ username: req.user.username, email: user.email });
};

exports.deleteRoom = (req, res, next) => {
    res.json({ username: req.user.username, email: req.user.emails[0].value });
};
