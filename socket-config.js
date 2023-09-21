const User = require("./models/user");
const Message = require("./models/message");
const { addToStat } = require("./stat-functions");
const { getYoyoBySocketUUid } = require("./device-functions");
const logger = require("./logger");

module.exports = (io, cacheLogins) => {
	const sendCachedMessage = (user) => {
		Message.findOne({ user: user._id }).exec((err, message) => {
			if (err) {
				logger.error("Could not search for message.");
				logger.error(err);
			} else {
				if (!message) {
					logger.info(`No messages belonging to user ${user.macAddress}`);
					return null;
				} else {
					io.to(user.socketUuid).emit("msg qos1", message.message);
					logger.info(`Cached message found and delivered for user ${user.macAddress}`);
				}
			}
		});
	};

	const cacheMessage = (user, message) => {
		const newMessage = Message({
			user: user._id,
			message: message,
		});
		newMessage.save((err, data) => {
			if (err) {
				logger.error("Could not save message.");
				logger.error(err);
			} else {
				logger.info(`Saved message for ${user.macAddress}`);
			}
		});
	};

	io.on("connect", (socket) => {
		logger.info(`New client with id ${socket.id} connected.`);

		// Ask client for mac address
		socket.emit("send mac", "");

		socket.on("hey", (data) => {
			logger.info("Received hey from client.");
			socket.send("OK");
		});

		// When user sends their mac address, update the socket id
		socket.on("mac", (data) => {
			logger.info(`Received mac ${data.macAddress} from ${socket.id}`);

			// Search for user, update their socketUuid.
			User.findOne({ macAddress: data.macAddress }).exec((err, user) => {
				if (err) {
					logger.error("Could not search for user.");
					logger.error(err);
				} else {
					if (!user) {
						logger.info(`User ${data.macAddress} not found, creating new user.`);
						const newUser = User({
							macAddress: data.macAddress,
							socketUuid: socket.id,
						});
						newUser.save((_err, _data) => {
							if (_err) {
								logger.error("Could not save user.");
								logger.error(_err);
							} else {
								logger.info(`Created new user with mac address ${_data.macAddress}`);
							}
						});
					} else {
						user.socketUuid = socket.id;
						user.save((_err) => {
							logger.info(`Updated socket id of user ${user.macAddress}`);
							sendCachedMessage(user);
						});
					}
				}
			});
		});

		// When user sends a message, send it to the destination
		socket.on("msg", (data, id) => {
			// Intercept message if data.macAdress in loginCache
			let intercept = false;
			if (cacheLogins) {
				getYoyoBySocketUUid(socket.id).then((yoyo) => {
					const cacheLogin = cacheLogins.find((login) => login.yoyo === yoyo);
					if (!cacheLogin) {
						return;
					}
					if (cacheLogin.returned) {
						return;
					}
					if (cacheLogin) {
						logger.info(`Intercepted message from ${yoyo}. Hue: ${data.data.hue}`);
						intercept = true;
						// if data.data.hue is in 10% range of cacheLogin.hue, set cacheLogin.returned to true
						if (data.data.hue >= cacheLogin.hue - 15 && data.data.hue <= cacheLogin.hue + 15) {
							cacheLogin.returned = true;
							logger.info("Hue is in range, setting returned to true.");
						} else {
							logger.info(`Hue is not in range: ${data.data.hue}|${cacheLogin.hue}(${cacheLogin.hue - 15}-${cacheLogin.hue + 15})`);
						}
					}

					if (!intercept) {
						// Forward message to pair
						logger.info(`Got message addressed to ${data.macAddress}`);
						User.findOne({ macAddress: data.macAddress }).exec((err, user) => {
							if (err) {
								logger.error("Could not search.");
								logger.error(err);
							} else if (user) {
								if (user.socketUuid !== null) {
									// Send message
									io.to(user.socketUuid).emit("msg", data);
									addToStat("messages_sent", 1);
									logger.info(`Delivered message to ${user.socketUuid}`);
								} else {
									logger.info(`User ${user.macAddress} is disconnected.`);
									socket.emit("partner offline");
								}
							} else {
								logger.info(`User ${data.macAddress} could not be found in the database.`);
								socket.emit("unknown user");
							}
						});
					}
				});
			}
		});

		socket.on("msg qos1", (data, id) => {
			// Forward message to pair
			logger.info(`Got message addressed to ${data.macAddress}`);
			User.findOne({ macAddress: data.macAddress }).exec((err, user) => {
				if (err) {
					logger.error("Could not search.");
					logger.error(err);
				} else if (user) {
					if (user.socketUuid !== null) {
						// Send message
						io.to(user.socketUuid).emit("msg qos1", data);
						logger.info(`Delivered message to ${user.socketUuid}`);
					} else {
						logger.info(`User ${user.macAddress} is disconnected, message will be cached.`);
						socket.emit("partner offline");
						cacheMessage(user, data);
					}
				} else {
					logger.info(`User ${data.macAddress} could not be found in the database.`);
					socket.emit("unknown user");
				}
			});
		});

		socket.on("get stats", (data, id) => {
			logger.info("user stats requested");
			const stats = {
				users: 0,
				usersOnline: 0,
			};
			User.countDocuments({ socketUuid: null }).exec((err, usersOnline) => {
				if (err) {
					logger.error("Could not count.");
					logger.error(err);
				} else {
					stats.usersOnline = usersOnline;
				}
				User.countDocuments({}).exec((err, users) => {
					if (err) {
						logger.error("Could not count.");
						logger.error(err);
					} else {
						stats.users = users;
						socket.emit("stats", stats);
					}
				});
			});
		});

		socket.on("disconnect", (reason) => {
			logger.info(`Client with id ${socket.id} disconnected.`);
			User.findOne({ socketUuid: socket.id }).exec((err, user) => {
				if (err) {
					logger.error("Could not search.");
					logger.error(err);
				} else if (user) {
					user.socketUuid = null;
					user.save((_err, data) => {
						logger.info(`Erased socket id of ${user.macAddress}.`);
					});
				} else {
					logger.warn("Could not find user after disconnecting.");
				}
			});
		});
	});
};
