const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let pairSchema = new Schema({
  userA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  userB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  }
});

module.exports = mongoose.model('pair', pairSchema);
