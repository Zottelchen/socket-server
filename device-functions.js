const User = require("./models/user");
const Note = require("./models/note");
const { getRandomUUID } = require("./crypto-functions");
const { get } = require("mongoose");

async function findYoyo(socketUuid) {
	console.log(`INFO: Searching for YoYoNumber of ${socketUuid}`);
	try {
		const user = await User.findOne({ socketUuid }).exec();
		console.log(`INFO: Found socketUuid of ${socketUuid}: ${user.macAddress}`);
		return user ? user.macAddress : null;
	} catch (error) {
		console.error("Error:", error);
	}
}

async function findSocketUuid(macAddress) {
	console.log(`INFO: Searching for socketUuid of ${macAddress}`);
	try {
		const user = await User.findOne({ macAddress }).exec();
		console.log(`INFO: Found socketUuid of ${macAddress}: ${user.socketUuid}`);
		return user ? user.socketUuid : null;
	} catch (error) {
		console.error("Error:", error);
	}
}

async function sendLight(socketUuid, hue, io) {
	console.log(`INFO: Sending hue ${hue} to ${socketUuid}`);
	await io.to(socketUuid).emit("msg", { macAddress: "0", data: { project: "lighttouch", hue: `${hue}` } });
}

async function createNote(yoyo_number) {
	// create a note when called the first time
	const newNote = Note({
		yoyo: yoyo_number,
		name: yoyo_number,
		note: "",
		token_view: getRandomUUID() + getRandomUUID(),
		token_send: getRandomUUID() + getRandomUUID(),
		token_connect: getRandomUUID() + getRandomUUID(),
		image: "/img/placeholder.jpg",
	});
	newNote.save((err, data) => {
		if (err) {
			console.log("ERROR-5: Could not save note.");
			console.log(err);
		}
	});
	return newNote;
}

async function getNote(yoyo_number) {
	const note = await Note.findOne({ yoyo: `${yoyo_number}` }).exec();
	if (note) {
		return note;
	} else {
		return createNote(yoyo_number);
	}
}

module.exports = { findSocketUuid, sendLight, findYoyo, getNote };
