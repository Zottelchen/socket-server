const User = require('./models/user');

module.exports = (io) => {
  io.on('connect', socket => {
    console.log(`INFO: New client with id ${socket.id} connected.`);

    // Ask client for mac address
    socket.emit('send mac', '');

    socket.on('hey', (data) => {
      console.log("INFO: Received hey from client.");
      socket.send('OK');
    });

    // When user sends their mac address, update the socket id
    socket.on('mac', (data) => {
      console.log(data);
      console.log(`INFO: Received mac ${data.macAddress} from ${socket.id}`);

      // Search for user, update their socketUuid.
      User.findOne({macAddress: data.macAddress})
      .exec((err, user) => {
        if (err) {
          console.log("ERROR: Could not search.");
        } else {
          if (!user) {
            console.log(`INFO: User ${data.macAddress} not found, creating new user.`);
            let newUser = User({
              macAddress: data.macAddress,
              socketUuid: socket.id
            });
            newUser.save((_err, _data) => {
              if (_err) {
                console.log("ERROR: Could not save user.");
              } else {
                console.log(`INFO: Created new user with mac address ${_data.macAddress}`);
              }
            });
          } else {
            user.socketUuid = socket.id;
            user.save((_err) => {
              console.log(`INFO: Updated socket id of user ${user.macAddress}`);
            });
          }
        }
      });
    });

    // When user sends a message, send it to the destination
    socket.on('msg', (data) => {
      // Forward message to pair
      console.log(`INFO: Got message addressed to ${data.macAddress}`);
      User.findOne({macAddress: data.macAddress})
      .exec((err, user) => {
        if (err) {
          console.log("ERROR: Could not search.");
        } else if (user) {
          if (user.socketUuid !== null) {
            // Send message
            io.to(user.socketUuid).emit('msg', data);
          } else {
            console.log(`INFO: User ${user.macAddress} is disconnected, message will not be sent.`);
          }
        } else {
          console.log(`INFO: User ${data.macAddress} could not be found in the database.`);
        }
      });
    });

    socket.on('disconnect', (reason) => {
      console.log(`INFO: Client with id ${socket.id} disconnected.`);
      User.findOne({socketUuid: socket.id})
      .exec((err, user) => {
        if (err) {
          console.log("ERROR: Could not search.");
        } else if (user) {
          user.socketUuid = null;
          user.save((_err, data) => {
            console.log(`INFO: Erased socket id of ${data.macAddress}.`);
          });
        } else {
          console.log("WARN: Could not find user after disconnecting.");
        }
      });
    });
  });
};
