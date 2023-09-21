const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const noteSchema = new Schema({
	yoyo: String,
	name: String,
	note: String,
	token_view: String,
	token_send: String,
	//token_connect: String,
	image: String, //base64 encoded or path to placeholder
	override: [String],
});

module.exports = mongoose.model("note", noteSchema);
