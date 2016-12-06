const async = require('async');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const User = require('../models/User');

var emailActivationRequest = function(req,res,token,user) {
  const mailOptions = {
          to: user.email,
          from: 'hackathon@starter.com',
          subject: 'Activate your account on Hackathon Starter',
          text: `You are receiving this email because you have registered for a new account.\n\n
            Please click on the following link, or paste this into your browser to complete the account activation process:\n\n
            http://${req.headers.host}/activate/${token}\n\n
            If you did not request this, please ignore this email and your account will not be activated.\n`
        };
       
        var helper = require('sendgrid').mail;
        var from_email = new helper.Email(mailOptions.from);
        var to_email = new helper.Email(mailOptions.to);
        
        var content = new helper.Content('text/plain', mailOptions.text);
        var mail = new helper.Mail(from_email, mailOptions.subject, to_email, content);

        var sg = require('sendgrid')(process.env.SENDGRID_PASSWORD);
        var request = sg.emptyRequest({
          method: 'POST',
          path: '/v3/mail/send',
          body: mail.toJSON(),
        });

        sg.API(request, function(error, response) {
          console.log(response.statusCode);
          console.log(response.body);
          console.log(response.headers);
          req.flash('success', { msg: 'Success ! Please Check your email and click on the link to Activate your Account.' });
          res.redirect('/actmail');
        });
}
/**
 * GET /login
 * Login page.
 */

exports.getLogin = (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('account/login', {
    title: 'Login'
  });
};

/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = (req, res, next) => {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password cannot be blank').notEmpty();
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/login');
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      req.flash('errors', info);
      return res.redirect('/login');
    }
    //console.log("Activation switch="+user.activated+ " Token="+user.activationToken);
    if (user.activated != 'Y') {
      req.flash('errors', { msg: 'Account not activated yet !. Please check your email to activate your account' });
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Success! You are logged in.' });
      res.redirect(req.session.returnTo || '/');
    });
  })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
exports.logout = (req, res) => {
  req.logout();
  res.redirect('/');
};

/**
 * GET /signup
 * Signup page.
 */
exports.getSignup = (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('account/signup', {
    title: 'Create Account'
  });
};

/**
 * POST /signup
 * Create a new local account.
 */
exports.postSignup = (req, res, next) => {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/signup');
  }

  const user = new User({
    email: req.body.email,
    password: req.body.password
  });

  User.findOne({ email: req.body.email }, (err, existingUser) => {
    if (err) { return next(err); }
    if (existingUser) {
      req.flash('errors', { msg: 'Account with that email address already exists.' });
      return res.redirect('/signup');
    }
   
    async.waterfall([
      function createRandomToken(done) {
        crypto.randomBytes(16, (err, buf) => {
          const token = buf.toString('hex');
          done(err, token);
        });
      },

     function setRandomToken(token, done) {
    	 user.activationToken = token;
    	 user.activated = 'N';
         user.activationExpires = Date.now() + (24*60*60*1000); // 24 hours
         done(err, token, user);
      },
      
      function saveNewAccount(token, user, done) {
    	  user.save((err) => {
    	      if (err) { return next(err); }
    	    });

 	     done(err, token, user);
    	  
      },
       
      function sendActivaionEmail(token, user, done) { 
         emailActivationRequest(req,res,token,user);
      }
    ], (err) => {
      if (err) { return next(err); }
      res.redirect('/signup');
    });
    
  });
};

/**
 * GET /activate/:token
 * Activate Account page.
 */
exports.getActivate = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  User
    .findOne({ activationToken: req.params.token })
    .where('activationExpires').gt(Date.now())
    .exec((err, user) => {
      if (err) { return next(err); }
      if (!user) {
        req.flash('errors', { msg: 'Activation token is invalid or has expired.' });
        return res.redirect('/actmail');
      }
      user.activationToken = undefined;
      user.activationExpires = undefined;
      user.activated = 'Y';
      user.save((err) => {
            if (err) { return next(err); }
            req.flash('success', { msg: 'Account was successfully Activated ! Please login to your account.' });
            return res.redirect('/login');
          });
    });
};



/**
 * GET /account
 * Profile page.
 */
exports.getAccount = (req, res) => {
  res.render('account/profile', {
    title: 'Account Management'
  });
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = (req, res, next) => {
  req.assert('email', 'Please enter a valid email address.').isEmail();
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/account');
  }

  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user.email = req.body.email || '';
    user.profile.name = req.body.name || '';
    user.profile.gender = req.body.gender || '';
    user.profile.location = req.body.location || '';
    user.profile.website = req.body.website || '';
    user.save((err) => {
      if (err) {
        if (err.code === 11000) {
          req.flash('errors', { msg: 'The email address you have entered is already associated with an account.' });
          return res.redirect('/account');
        }
        return next(err);
      }
      req.flash('success', { msg: 'Profile information has been updated.' });
      res.redirect('/account');
    });
  });
};

/**
 * POST /account/password
 * Update current password.
 */
exports.postUpdatePassword = (req, res, next) => {
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/account');
  }

  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user.password = req.body.password;
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Password has been changed.' });
      res.redirect('/account');
    });
  });
};

/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = (req, res, next) => {
  User.remove({ _id: req.user.id }, (err) => {
    if (err) { return next(err); }
    req.logout();
    req.flash('info', { msg: 'Your account has been deleted.' });
    res.redirect('/');
  });
};

/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
exports.getOauthUnlink = (req, res, next) => {
  const provider = req.params.provider;
  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user[provider] = undefined;
    user.tokens = user.tokens.filter(token => token.kind !== provider);
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('info', { msg: `${provider} account has been unlinked.` });
      res.redirect('/account');
    });
  });
};

/**
 * GET /reset/:token
 * Reset Password page.
 */
exports.getReset = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  User
    .findOne({ passwordResetToken: req.params.token })
    .where('passwordResetExpires').gt(Date.now())
    .exec((err, user) => {
      if (err) { return next(err); }
      if (!user) {
        req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
        return res.redirect('/forgot');
      }
      res.render('account/reset', {
        title: 'Password Reset'
      });
    });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 */
exports.postReset = (req, res, next) => {
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('confirm', 'Passwords must match.').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('back');
  }

  async.waterfall([
    function resetPassword(done) {
      User
        .findOne({ passwordResetToken: req.params.token })
        .where('passwordResetExpires').gt(Date.now())
        .exec((err, user) => {
          if (err) { return next(err); }
          if (!user) {
            req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
            return res.redirect('back');
          }
          user.password = req.body.password;
          user.passwordResetToken = undefined;
          user.passwordResetExpires = undefined;
          user.activationToken = undefined;
          user.activated = 'Y';
          user.save((err) => {
            if (err) { return next(err); }
            req.logIn(user, (err) => {
              done(err, user);
            });
          });
        });
    },
    function sendResetPasswordEmail(user, done) {
   
      const mailOptions = {
        to: user.email,
        from: 'hackathon@starter.com',
        subject: 'Your Hackathon Starter password has been changed',
        text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`
      };
    var helper = require('sendgrid').mail;
  	var from_email = new helper.Email(mailOptions.from);
  	var to_email = new helper.Email(mailOptions.to);
  	
  	var content = new helper.Content('text/plain', mailOptions.text);
  	var mail = new helper.Mail(from_email, mailOptions.subject, to_email, content);

  	var sg = require('sendgrid')(process.env.SENDGRID_PASSWORD);
  	var request = sg.emptyRequest({
  	  method: 'POST',
  	  path: '/v3/mail/send',
  	  body: mail.toJSON(),
  	});

  	sg.API(request, function(error, response) {
  	  console.log(response.statusCode);
  	  console.log(response.body);
  	  console.log(response.headers);
  	  req.flash('success', { msg: 'Success! Password Reset Completed !' });
  	  res.redirect('/');
  	});
    }
  ], (err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
};


/**
 * GET /forgot
 * Forgot Password page.
 */
exports.getForgot = (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render('account/forgot', {
    title: 'Forgot Password'
  });
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */

exports.postForgot = (req, res, next) => {
  req.assert('email', 'Please enter a valid email address.').isEmail();
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/forgot');
  }

  async.waterfall([
    function createRandomToken(done) {
      crypto.randomBytes(16, (err, buf) => {
        const token = buf.toString('hex');
        done(err, token);
      });
    },

   function setRandomToken(token, done) {
      User.findOne({ email: req.body.email }, (err, user) => {
        if (err) { return done(err); }
        if (!user) {
          req.flash('errors', { msg: 'Account with that email address does not exist.' });
          return res.redirect('/forgot');
        }
        user.passwordResetToken = token;
        user.passwordResetExpires = Date.now() + 3600000; // 1 hour
        user.save((err) => {
          done(err, token, user);
        });
      });
    },

    function sendForgotPasswordEmail(token, user, done) { 
       
      const mailOptions = {
        to: user.email,
        from: 'hackathon@starter.com',
        subject: 'Reset your password on Hackathon Starter',
        text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
          Please click on the following link, or paste this into your browser to complete the process:\n\n
          http://${req.headers.host}/reset/${token}\n\n
          If you did not request this, please ignore this email and your password will remain unchanged.\n`
      };
     
      var helper = require('sendgrid').mail;
      var from_email = new helper.Email(mailOptions.from);
      var to_email = new helper.Email(mailOptions.to);
      
      var content = new helper.Content('text/plain', mailOptions.text);
      var mail = new helper.Mail(from_email, mailOptions.subject, to_email, content);

      var sg = require('sendgrid')(process.env.SENDGRID_PASSWORD);
      var request = sg.emptyRequest({
        method: 'POST',
        path: '/v3/mail/send',
        body: mail.toJSON(),
      });

      sg.API(request, function(error, response) {
        console.log(response.statusCode);
        console.log(response.body);
        console.log(response.headers);
        req.flash('success', { msg: 'Success! Reset Password Reset Request Sent. Please Click on your email request link to Complete Password Reset.' });
        res.redirect('/forgot');
      });
    }
  ], (err) => {
    if (err) { return next(err); }
    res.redirect('/forgot');
  });
};


/**
 * GET /forgot
 * Forgot Password page.
 */
exports.getActmail = (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render('account/actmail', {
    title: 'Re-send Activation Email'
  });
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */

exports.postActmail = (req, res, next) => {
  req.assert('email', 'Please enter a valid email address.').isEmail();
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/actmail');
  }

    async.waterfall([
      function createRandomToken(done) {
        crypto.randomBytes(16, (err, buf) => {
          const token = buf.toString('hex');
          done(err, token);
        });
      },
      function setRandomToken(token, done) {
          User.findOne({ email: req.body.email }, (err, user) => {
            if (err) { return done(err); }
            if (!user) {
              req.flash('errors', { msg: 'Account with that email address does not exist.' });
              return res.redirect('/actmail');
            }
            if (user.activated == 'Y') {
              req.flash('errors', { msg: 'Account already activated !' });
              return res.redirect('/login');
            }
            user.activationToken = token;
            user.activated = 'N';
            user.activationExpires = Date.now() + (24*60*60*1000); // 24 hours
            user.save((err) => {
              done(err, token, user);
            });
          });
       },
      function sendActivaionEmail(token, user, done) { 
         emailActivationRequest(req,res,token,user);
      }
    ], (err) => {
      if (err) { return next(err); }
      res.redirect('/actmail');
    });
    
};
