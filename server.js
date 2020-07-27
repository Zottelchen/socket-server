const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');

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
    }
});

// Create HTTP and WS server.
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    console.log('INFO: Received mesage', data);
    const data = JSON.parse(message);
    if ('macAddress' in data) {
      // Find user and check if we have their uuid. If not, let's update it.
      // Find pair and send message if connected.
    }
  });
});

// HTTP root.
app.get('/', function (req, res) {
  res.send('Hello World')
})

// Routes
const pairs = require('./routes/pairs');
app.use('/api/', pairs);

// Start server.
const listener = server.listen(port, () => {
  console.log(`INFO: Server started on port ${port}.`);
});

module.exports = server;
