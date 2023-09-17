const express = require("express");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
const mcache = require("memory-cache");
const { findSocketUuid, sendLight } = require("./device-functions");

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
const socketConfig = require("./socket-config");
const io = require("socket.io")(server);
socketConfig(io);

// Device Functions
app.post("/device", function (req, res) {
	if (!/^\d+$/.test(req.body.yymn) || req.body.yymn.length !== 10) {
		// If the Yo-Yo Number is not a number
		res.render("device", { error: "Please enter a valid Yo-Yo Number." });
		return;
	}

	const socketUuid = findSocketUuid(req.body.yymn).then((socketUuid) => {
		if (socketUuid === null) {
			// If the Yo-Yo Number is not in the database
			res.render("device", { error: "Yo-Yo Number not found. Please enter a valid Yo-Yo Number." });
			return;
		}

		// generate random int between 0 and 255
		const hue = Math.floor(Math.random() * 256);
		// If the Yo-Yo Number is valid
		sendLight(socketUuid, { macAddress: "0", data: { project: "lighttouch", hue: `${hue}` } }, io);
		res.render("device-login", { form_data: req.body, socketUuid: socketUuid, hue: hue });
	});
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
