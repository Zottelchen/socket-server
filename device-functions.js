const User = require("./models/user");
const Note = require("./models/note");
const logger = require("./logger");
const { addToStat } = require("./stat-functions");
const { getRandomUUID } = require("./crypto-functions");

async function getYoyoBySocketUUid(socketUuid) {
	return getYoyoBySocketUuidOrUid("socketUuid", socketUuid);
}

async function getYoyoByUid(uidtype, uid) {
	return getYoyoBySocketUuidOrUid(uidtype, uid);
}

async function getYoyoBySocketUuidOrUid(uidtype, identifier) {
	try {
		logger.info(`Searching for YoYoNumber by ${uidtype}: ${identifier}`);
		if (uidtype === "socketUuid") {
			const user = await User.findOne({ socketUuid: identifier }).exec();
			logger.info(`Found yoyo of ${identifier}: ${user.macAddress}`);
			return user ? user.macAddress : null;
		} else if (uidtype === "send" || uidtype === "view") {
			const queryField = uidtype === "send" ? "token_send" : "token_view";
			const note = await Note.findOne({ [queryField]: identifier }).exec();
			return note ? note.yoyo : null;
		} else {
			throw new Error("Invalid uidtype");
		}
	} catch (error) {
		logger.error(`Lookup-Error: ${error}\n${error.stack}`);
		return null;
	}
}

async function findSocketUuid(macAddress) {
	logger.info(`Searching for socketUuid of ${macAddress}`);
	try {
		const user = await User.findOne({ macAddress }).exec();
		logger.info(`Found socketUuid of ${macAddress}: ${user.socketUuid}`);
		return user ? user.socketUuid : null;
	} catch (error) {
		logger.error(`Error: ${error}\n${error.stack}`);
	}
}

async function sendLight(socketUuid, hue, io) {
	addToStat("messages_sent", 1);
	logger.info(`Sending hue ${hue} to ${socketUuid}`);
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
		//token_connect: getRandomUUID() + getRandomUUID(),
		image: "/img/placeholder.jpg",
		override: [],
	});
	newNote.save((err, data) => {
		if (err) {
			logger.error("Could not save note.");
			logger.error(err);
		}
	});
	return newNote;
}

async function getNote(yoyo_number) {
	const note = await Note.findOne({ yoyo: yoyo_number }).exec();
	return note || createNote(yoyo_number);
}

async function updateNote(yoyo_number, field, value) {
	getNote(yoyo_number).then((note) => {
		note[field] = value;
		note.save((err, data) => {
			if (err) {
				logger.error("Could not save note.");
				logger.error(err);
			}
		});
	});
}

module.exports = { findSocketUuid, sendLight, getYoyoBySocketUUid, getNote, getYoyoByUid, getYoyoBySocketUuidOrUid, updateNote };
