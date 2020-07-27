const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  macAddress: String,
  socketUuid: String
});

module.exports = mongoose.model('user', userSchema);
