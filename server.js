const express = require("express");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
const mcache = require("memory-cache");
const { findSocketUuid, sendLight } = require("./device-functions");
const { encrypt, decrypt, getKeyFromPassword, getSalt, getRandomUUID } = require("./crypto-functions");

// const User = require("./models/user");

if (process.env.LOGGING === "true") {
	const chalk = require("chalk");
	const morgan = require("morgan");
}

// Connect to DB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost/node-testing", { useNewUrlParser: true, useUnifiedTopology: true }, (err, res) => {
	if (err) {
		console.error(`ERROR: Error connecting to the database. ${err}`);
	} else {
		console.info("INFO: Connected to Database!");
		/*
      console.log('INFO: Wiping all socketUuids...');
      User.find({}, (_err, _res) => {
        _res.forEach(user => {
          user.socketUuid = null;
          user.save((__err, data) => {
            console.log(`INFO: Wiped socketUuid of ${data.macAddress}.`);
          });
        })
      });
      console.log('INFO: Wiped socketUuids');
      */
	}
});

// Create HTTP server
const app = express();
const server = http.createServer(app);

// Setup View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Setup Express body parser
app.use(express.urlencoded({ extended: true }));

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

// Setup logging if enabled
if (process.env.LOGGING === "true") {
	app.use(
		morgan(
			`🍄M ➡ ${chalk.gray("[:date[clf]]")} "${chalk.green(":method")} ${chalk.blue(":url")} HTTP/:http-version" ${chalk.gray(":remote-addr")}   ${chalk.yellow(
				":status",
			)} :res[content-length] ":referrer" ${chalk.gray('":user-agent"')}`,
		),
	);
	console.info("Morgan logging enabled.");
}

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

app.get("/stats", function (req, res) {
	res.render("stats");
});
app.get("/privacy", function (req, res) {
	res.render("privacy");
});
app.get("/about", function (req, res) {
	res.render("about");
});

app.get("/test", function (req, res) {
	res.render("test");
});

const update = require("./routes/update");
app.use("/", update);

const stats = require("./routes/stats");
app.use("/stats_api", cache(15 * 60), stats);

// socket.io server
let cacheLogins = [];
const socketConfig = require("./socket-config");
const io = require("socket.io")(server);
socketConfig(io, cacheLogins);

// Device Functions
app.post("/device", function (req, res) {
	// If the Yo-Yo Number is not a number
	if (!/^\d+$/.test(req.body.yymn) || req.body.yymn.length !== 10) {
		res.render("device", { error: "Please enter a valid Yo-Yo Number." });
		return;
	}

	const socketUuid = findSocketUuid(req.body.yymn).then((socketUuid) => {
		// If the Yo-Yo Number is not in the database
		if (socketUuid === null) {
			res.render("device", { error: "Yo-Yo Number not found. Please enter a valid Yo-Yo Number." });
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
			cacheLogins.push({ session_uuid: session_uid, yoyo: req.body.yymn, hue: hue, time: Date.now(), returned: false,  });
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

const SECRET_KEY = process.env.SECRET_KEY || "secret";
if (SECRET_KEY === "secret") {
	console.warn("WARNING: Environment SECRET_KEY not set.");
}

app.get("/device-check", function (req, res) {
	const cacheLogin = cacheLogins.find((login) => login.session_uuid === req.query.session_uuid);
	if (cacheLogin) {
		if (cacheLogin.returned) {
			const salt = getSalt();
			const key = getKeyFromPassword(SECRET_KEY, salt);
			const token = `${salt.toString("hex")}$${encrypt(cacheLogin.yoyo, key).toString("hex")}`;
			res.send({ success: true, error: false, url: `/device-control?token=${token}` });
		} else {
			res.send({ success: false, error: false, url: false });
		}
	} else {
		res.send({ success: false, error: "No session found.", url: "/device?session_missing" });
	}
});

app.get("/device-control", function (req, res) {
	const salt = req.query.token.split("$")[0];
	const key = getKeyFromPassword(SECRET_KEY, Buffer.from(salt, "hex"));
	const encrypted = Buffer.from(req.query.token.split("$")[1], "hex");
	const yoyo = decrypt(encrypted, key);
	if (yoyo) {
		// Check if Yoyo is in database
		findSocketUuid(yoyo).then((socketUuid) => {
			if (socketUuid === null) {
				res.render("device", { error: "Yo-Yo Number not found. Please enter a valid Yo-Yo Number." });
				return;
			}
			res.render("device-control", { yoyo: yoyo });
		});
	} else {
		res.render("device", { error: "We could not find a Yo-Yo with that key. Please enter a valid Yo-Yo Number and try to login again." });
	}
});

// Error handling
/// Handle 500
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).render("error", {
		pageTitle: "Error 500 - Server goofed.",
		errorMessage: "Something broke :(",
		statusCode: "500",
		textColor: "#FFD800",
	});
});
app.get("/500", function (req, res) {
	res.status(500).render("error", {
		pageTitle: "Error 500 - Server goofed.",
		errorMessage: "Something broke :(",
		statusCode: "500",
		textColor: "#FFD800",
	});
});
/// Handle 404
app.use((req, res) => {
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
		console.info(`INFO: Server started on port ${PORT}.`);
	});
};

module.exports = server;
