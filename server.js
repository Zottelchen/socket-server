require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
const mcache = require("memory-cache");
const multer = require("multer");
const upload = multer({});
const marked = require("marked");
const DOMPurify = require("isomorphic-dompurify");
//
const logger = require("./logger");
const { findSocketUuid, sendLight, getNote, getYoyoByUid, updateNote, getNoteByToken } = require("./device-functions");
const { encrypt, getKeyFromPassword, getSalt, getRandomUUID, yoyoFromToken } = require("./crypto-functions");
const { addToStat, getAllStats, getStat } = require("./stat-functions");

const SECRET_KEY = process.env.SECRET_KEY || "secret";
if (SECRET_KEY === "secret") {
	logger.warn("Environment SECRET_KEY not set.");
}

// Connect to DB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost/node-testing", { useNewUrlParser: true, useUnifiedTopology: true }, (err, res) => {
	if (err) {
		logger.error(`Error connecting to the database. ${err}`);
	} else {
		logger.info("Connected to Database!");
		if (process.env.CLEAR_SOCKETS === "true") {
			const User = require("./models/user");
			logger.warn("Wiping all socketUuids...");
			User.find({}, (_err, _res) => {
				_res.forEach((user) => {
					user.socketUuid = null;
					user.save((__err, data) => {
						logger.info(`Wiped socketUuid of ${data.macAddress}.`);
					});
				});
			});
			logger.info("Wiped socketUuids");
		}
	}
});

// Create HTTP server
const app = express();
const server = http.createServer(app);

// Setup logging if enabled
if (process.env.WEB_LOGGING === "true") {
	const pinohttp = require("pino-http")();
	app.use(pinohttp);
	logger.warn("Web logging enabled. Use only for debugging.");
}

// Setup View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Setup Express body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Caching middleware
const cache = (duration) => {
	return (req, res, next) => {
		const key = `__express__${req.originalUrl}` || req.url;
		const cachedBody = mcache.get(key);
		if (cachedBody) {
			res.send(cachedBody);
			return;
		} else {
			res.sendResponse = res.send;
			res.send = (body) => {
				mcache.put(key, body, duration * 1000);
				res.sendResponse(body);
			};
			next();
		}
	};
};

// Setup static files
app.use(express.static(path.join(__dirname, "public")));

// HTTP root
app.get("/", function (req, res) {
	res.render("index");
});
app.get("/home", function (req, res) {
	res.render("index");
});
app.get("/build", function (req, res) {
	res.render("build");
});
app.get("/faq", function (req, res) {
	res.render("faq");
});
app.get("/device", function (req, res) {
	if (req.query.session_missing === "") {
		res.render("device", { error: "Session missing. Please enter a valid Yo-Yo Number." });
		return;
	}
	res.render("device", { error: false });
});

app.get("/stats", async function (req, res) {
	const viewed_stats = ["notes_viewed", "images_uploaded", "name_updated", "note_updated", "messages_sent"];

	try {
		const statPromises = viewed_stats.map((stat) => getStat(stat));
		const [notes_viewed, images_uploaded, name_updated, note_updated, messages_sent] = await Promise.all(statPromises);
		res.render("stats", {
			notes_viewed,
			images_uploaded,
			name_updated,
			note_updated,
			messages_sent,
		});
	} catch (error) {
		console.error("Error fetching stats:", error);
		res.status(500).send("Error fetching stats");
	}
});
app.get("/privacy", function (req, res) {
	res.render("privacy");
});
app.get("/about", function (req, res) {
	res.render("about");
});

const update = require("./routes/update");
app.use("/", update);

const stats = require("./routes/stats");
app.use("/stats_api", cache(15 * 60), stats);

// socket.io server
let cacheLogins = [];
const socketConfig = require("./socket-config");
const { get } = require("superagent");
const io = require("socket.io")(server);
socketConfig(io, cacheLogins);

// Device Functions
app.post("/device", function (req, res) {
	// If the Yo-Yo Number is not a number
	if (!/^\d+$/.test(req.body.yymn) || req.body.yymn.length !== 10) {
		res.render("device", { error: "Please enter a valid Yo-Yo Number." });
		return;
	}

	findSocketUuid(req.body.yymn).then((socketUuid) => {
		// If the Yo-Yo Number is not in the database
		if (socketUuid === null) {
			res.render("device", { error: "Yo-Yo Number is not connected. Please enter a valid Yo-Yo Number." });
			return;
		}
		if (socketUuid === false) {
			res.render("device", { error: "Yo-Yo Number not found & has never been seen by the server." });
			return;
		}

		// If the Yo-Yo Number is valid
		const hue = Math.floor(Math.random() * 256);

		// Check if already in cache: if yes, overwrite, else add
		const cacheLogin = cacheLogins.find((login) => login.yoyo === req.body.yymn);
		const session_uid = getRandomUUID();
		if (cacheLogin) {
			cacheLogin.session_uuid = session_uid;
			cacheLogin.hue = hue;
			cacheLogin.time = Date.now();
			cacheLogin.returned = false;
		} else {
			cacheLogins.push({ session_uuid: session_uid, yoyo: req.body.yymn, hue: hue, time: Date.now(), returned: false });
		}

		// Send the light
		sendLight(socketUuid, hue, io);
		res.render("device-login", { hue: hue, session_uuid: session_uid });

		//remove from cache after 15 minutes
		setTimeout(() => {
			cacheLogins = cacheLogins.filter((login) => login.time + 900000 > Date.now());
		}, 900001);
	});
});

app.get("/device/connection", function (req, res) {
	const yoyo = req.query.yymn || req.query.yoyo;
	if (!yoyo) {
		return res.status(400).json({ success: false, error: "No Yo-Yo Number missing" });
	}
	if (!/^\d+$/.test(yoyo) || yoyo.length !== 10) {
		return res.status(400).json({ success: false, error: "Yo-Yo Number not valid" });
	}
	findSocketUuid(yoyo).then((socketUuid) => {
		if (socketUuid === false) {
			return res.status(400).json({ success: false, warning: "Yo-Yo Number not found & has never been seen by the server." });
		}
		if (socketUuid === null) {
			return res.status(400).json({ success: false, warning: "Yo-Yo Machine is not connected" });
		}
		return res.json({ success: true, error: false });
	});
});

app.get("/device/check", function (req, res) {
	const cacheLogin = cacheLogins.find((login) => login.session_uuid === req.query.session_uuid);
	if (cacheLogin) {
		if (cacheLogin.returned) {
			const salt = getSalt();
			const key = getKeyFromPassword(SECRET_KEY, salt);
			const token = `${salt.toString("hex")}$${encrypt(cacheLogin.yoyo, key).toString("hex")}`;
			res.json({ success: true, error: false, url: `/device/control?token=${token}` });
		} else {
			res.json({ success: false, error: false, url: false });
		}
	} else {
		res.status(400).json({ success: false, error: "No session found.", url: "/device?session_missing" });
	}
});

app.post("/device/upload", upload.single("image"), function (req, res) {
	if (!req.query.token) {
		return res.status(400).json({ success: false, error: "No token provided" });
	}
	if (!req.file) {
		return res.status(400).json({ success: false, error: "No file uploaded" });
	}
	const yoyo = yoyoFromToken(req.query.token);
	const allowedFileTypes = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
	const extension = path.extname(req.file.originalname).toLowerCase();
	const mimetype = req.file.mimetype;
	if (!allowedFileTypes.includes(extension) || !mimetype.startsWith("image/")) {
		return res.status(400).json({ success: false, error: "File type not allowed" });
	}
	const encoded = `data:${mimetype};base64,${req.file.buffer.toString("base64")}`;
	updateNote(yoyo, "image", encoded);
	addToStat("images_uploaded", 1);
	return res.json({ success: true, error: false, image: encoded });
});

app.post("/device/update", function (req, res) {
	if (!req.query.token) {
		return res.status(400).json({ success: false, error: "No token provided" });
	}
	if (!req.query.field) {
		return res.status(400).json({ success: false, error: "No field provided" });
	}
	if (!req.body.value) {
		return res.status(400).json({ success: false, error: "No value provided" });
	}
	const yoyo = yoyoFromToken(req.query.token);
	if (req.query.field === "name" || req.query.field === "note") {
		updateNote(yoyo, req.query.field, req.body.value);
		addToStat(`${req.query.field}_updated`, 1);
		return res.json({ success: true, error: false, field: req.query.field, value: req.body.value });
	} else if (req.query.field === "override") {
		const override = req.body.value.split(",").map((value) => value.trim());
		//validate override
		for (let i = 0; i < override.length; i++) {
			if (!/^\d+$/.test(override[i]) || override[i].length !== 10) {
				return res.status(400).json({ success: false, error: "Override not valid. Per Yo-Yo Machine there should be 10 numbers only." });
			}
		}
		updateNote(yoyo, req.query.field, override);
		return res.json({ success: true, error: false, field: req.query.field, value: override });
	} else {
		return res.status(400).json({ success: false, error: "Field not allowed" });
	}
});

app.get("/device/control", function (req, res) {
	const yoyo = yoyoFromToken(req.query.token);
	let yoyo_status = "Online!";
	if (yoyo) {
		// Check if Yoyo is in database
		findSocketUuid(yoyo).then((socketUuid) => {
			if (socketUuid === false) {
				res.render("device", { error: "Yo-Yo Number not found & has never been seen by the server." });
				return;
			} else if (socketUuid === null) {
				yoyo_status = "Not connected!";
			}

			// Get Note from Database
			getNote(yoyo).then((note) => {
				res.render("device-control", {
					token: req.query.token,
					status: yoyo_status,
					yoyo: yoyo,
					name: note.name,
					note: note.note,
					token_view: note.token_view,
					token_send: note.token_send,
					override: note.override.join(", ") || "",
					//token_connect: note.token_connect,
					image: note.image,
					host: `${req.protocol}://${req.headers.host}`,
				});
			});
		});
	} else {
		res.render("device", { error: "We could not find a Yo-Yo with that key. Please enter a valid Yo-Yo Number and try to login again." });
	}
});

app.get("/device/view", function (req, res) {
	const id = req.query.id;
	if (id) {
		getNoteByToken(id).then((note) => {
			if (note === null) {
				return res.render("device", { error: "Note not found. Please enter make sure that the link is correct." });
			}
			addToStat("notes_viewed", 1);
			res.render("device-view", {
				name: DOMPurify.sanitize(note.name),
				note: DOMPurify.sanitize(marked.parse(note.note)),
				image: note.image,
			});
		});
	}
});

app.get("/device/light", function (req, res) {
	const id = req.query.id;
	let hue = req.query.hue;
	if (hue !== "rainbow") {
		hue = Number(hue);
	}
	if (id) {
		getYoyoByUid("send", id).then((yoyo) => {
			if (yoyo === null) {
				res.send({ success: false, error: "Yo-Yo Number not found. Please enter a valid Yo-Yo Number. Device could also be disconnected." });
				return;
			}
			findSocketUuid(yoyo).then((socketUuid) => {
				if (socketUuid === null) {
					res.send({ success: false, error: "Socket not found. Is the device online?" });
					return;
				}

				if (hue === "rainbow") {
					// for values 0 - 255 send light
					for (let i = 0; i < 256; i++) {
						setTimeout(() => {
							sendLight(socketUuid, i, io);
						}, i * 25);
					}
					res.send({ success: true, error: false });
				} else {
					if (!hue) {
						hue = Math.floor(Math.random() * 256);
					}
					if (hue < 0 || hue > 255) {
						res.send({ success: false, error: "Hue must be between 0 and 255. Alternatively, remove the hue-query for a random color." });
						return;
					}
					sendLight(socketUuid, hue, io);
					res.send({ success: true, error: false });
				}
			});
		});
	}
});

// Error handling
/// Handle 500
app.use((err, req, res, next) => {
	logger.error(`Error 500: ${req.url}: ${err}\n${err.stack}`);
	res.status(500).render("error", {
		pageTitle: "Error 500 - Server goofed.",
		errorMessage: "Something broke :(",
		statusCode: "500",
		textColor: "#FFD800",
	});
});
app.get("/500", function (req, res) {
	logger.error("Fake-Error 500");
	res.status(500).render("error", {
		pageTitle: "Error 500 - Server goofed.",
		errorMessage: "Something broke :(",
		statusCode: "500",
		textColor: "#FFD800",
	});
});
/// Handle 404
app.use((req, res) => {
	logger.warn(`Error 404: ${req.url}`);
	res.status(404).render("error", {
		pageTitle: "Error 404 - Page Not Found",
		errorMessage: "Page not found. :/",
		statusCode: "404",
		textColor: "#FF6A3D",
	});
});

// Start server
server.start = () => {
	const PORT = process.env.PORT || 5000;
	server.listen(PORT, () => {
		logger.info(`INFO: Server started on port ${PORT}.`);
	});
};

module.exports = server;
