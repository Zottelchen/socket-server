const express = require("express");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
const morgan = require("morgan");
const User = require("./models/user");
// Setup port
const port = process.env.PORT || 5000;

// Connect to DB
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost/node-testing",
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err, res) => {
    if (err) {
      console.error("ERROR: Error connecting to the database. " + err);
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
  }
);

// Create HTTP server
const app = express();
const server = http.createServer(app);

// Setup logging
app.use(morgan("combined"));
console.info("Morgan logging enabled.");

// Setup static files
app.use(express.static(path.join(__dirname, "public")));

// HTTP root
app.get("/", function (req, res) {
  console.info("INFO: Requested root.");
  res.sendFile(path.join(__dirname, "/public/home.html"));
});

const update = require("./routes/update");
app.use("/", update);

const stats = require("./routes/stats");
app.use("/stats", stats);

// socket.io server
const socketConfig = require("./socket-config");
let io = require("socket.io")(server);
socketConfig(io);

// Error handling
/// Handle 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "/public/404.html"));
});
/// Handle 500
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).sendFile(path.join(__dirname, "/public/500.html"));
});

// Start server
server.start = () => {
  server.listen(port, () => {
    console.info(`INFO: Server started on port ${port}.`);
  });
};

module.exports = server;
