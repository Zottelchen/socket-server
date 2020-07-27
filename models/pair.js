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

pairSchema.methods.addUsers = (userA_id, userB_id) => {
  this.userA = userA_id;
  this.userB = userB_id;
  return this.save();
};

module.exports = mongoose.model('pair', pairSchema);
