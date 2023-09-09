const express = require("express");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
const morgan = require("morgan");
const User = require("./models/user");
const PORT = process.env.PORT || 5000;
const chalk = require("chalk");

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

// Setup logging
app.use(
	morgan(
		`🍄M ➡ ${chalk.gray("[:date[clf]]")} "${chalk.green(":method")} ${chalk.blue(":url")} HTTP/:http-version" ${chalk.gray(":remote-addr")}   ${chalk.yellow(
			":status",
		)} :res[content-length] ":referrer" ${chalk.gray('":user-agent"')}`,
	),
);
console.info("Morgan logging enabled.");

// Setup static files
app.use(express.static(path.join(__dirname, "public")));

// HTTP root
app.get("/", function (req, res) {
	res.render("index");
});

app.get("/test", function (req, res) {
	res.render("test");
});

const update = require("./routes/update");
app.use("/", update);

const stats = require("./routes/stats");
app.use("/stats", stats);

// socket.io server
const socketConfig = require("./socket-config");
const io = require("socket.io")(server);
socketConfig(io);

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
	server.listen(PORT, () => {
		console.info(`INFO: Server started on port ${PORT}.`);
	});
};

module.exports = server;
