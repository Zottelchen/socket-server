const User = require("./models/user");

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

async function sendLight(socketUuid, light, io) {
	console.log(`INFO: Sending light ${light} to ${socketUuid}`);
	await io.to(socketUuid).emit("msg", light);
}

module.exports = { findSocketUuid, sendLight };
