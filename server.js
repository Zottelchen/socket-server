const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const User = require('./models/user');
// Setup port
const port = process.env.PORT || 5000;

// Connect to DB
mongoose.connect(
  process.env.MONGODB_URI || 'mongodb://localhost/node-testing',
  { useNewUrlParser: true,  useUnifiedTopology: true },
  (err, res) => {
    if(err) {
      console.log('ERROR: Error connecting to the database. ' + err);
    } else {
      console.log('INFO: Connected to Database!');
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
    }
});

// Create HTTP server
const app = express();
const server = http.createServer(app);

// HTTP root
app.get('/', function (req, res) {
  console.log('INFO: Requested root.');
  res.send('Hello World');
});

const update = require('./routes/update');
app.use('/', update);

// socket.io server
const socketConfig = require('./socket-config');
let io = require('socket.io')(server);
socketConfig(io);

// Start server
server.start = () => {
  server.listen(port, () => {
    console.log(`INFO: Server started on port ${port}.`);
  });
};

module.exports = server;
