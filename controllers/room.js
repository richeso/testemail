const async = require('async');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const Room = require('../models/Room');
const User = require('../models/User');

exports.testBasicAuth = (req, res, next) => {
    res.json({ "username": req.user.username });
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
