const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const statSchema = new Schema({
	name: String,
	stat: Number,
});

module.exports = mongoose.model("stat", statSchema);
