const async = require('async');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const Room = require('../models/Room');
const User = require('../models/User');

exports.basicAuth = (req, res, next) => {
  passport.authenticate('basic', { session: false }),
  function(req, res) {
    res.json({ username: req.user.username, email: req.user.emails[0].value });
  });
};


