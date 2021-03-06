const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomname: { type: String, unique: true },
  secret: String,
  roomExpires: Date,
  lastUpdated: Date,
  defaultMap: String,
  players: Array,

  profile: {
    playername: String,
    publicip: String,
    privateip: String
  }
}, { timestamps: true });

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
