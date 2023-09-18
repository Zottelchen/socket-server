const User = require("./models/user");

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

module.exports = { findSocketUuid, sendLight, findYoyo };
