process.env.NODE_ENV = 'test';

const chai = require('chai');
const should = chai.should();
const http = require('http');

const io = require('socket.io-client');
const socketUrl = 'http://localhost:5000';

const server = require('../server');
const User = require('../models/user');

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let clientA = null, clientB = null;

describe('socket.io server', () => {

  beforeEach((done) => {

    clientA = io(socketUrl, ioOptions);
    clientB = io(socketUrl, ioOptions);

    done();
  });

  afterEach((done) => {
    clientA.close();
    clientB.close();
    done();
  });

  before((done) => {
    server.start();
    done();
  });

  after((done) => {
    try {
      User.collection.drop();
    } catch (e) {
      if (e.code === 26) {
        console.log('namespace %s not found', User.collection.name);
      } else {
        console.log("ERROR: Failed to drop collection!");
        throw e;
      }
    }
    done();
  });

  it('should connect to the server', (done) => {
    clientA.on('connect', () => {
      done();
    });
  });

  it('should exchange mac address on connect', (done) => {
    clientA.on('send mac', () => {
      clientA.emit('mac', {macAddress: "TE:ST:TE:ST:TE"});
      setTimeout(() => {
        // Search for user, update their socketUuid.
        User.findOne({macAddress: "TE:ST:TE:ST:TE"})
          .exec((err, user) => {
            user.macAddress.should.equal("TE:ST:TE:ST:TE");
            done();
          });
        }, 3000);
    });
  });

  it('should get partner offline event when partner is disconnected', (done) => {
    clientA.on('partner offline', () => {
      done();
    });
    clientB.emit('mac', {macAddress: "HO:HO:HO:HO:HO"});
    setTimeout(() => {
      clientB.close();
    }, 1000);
    setTimeout(() => {
      clientA.emit('msg', {macAddress: "HO:HO:HO:HO:HO"});
    }, 3000);
  });

  it('should send a message from client a to client b', (done) => {
    clientB.emit('mac', {macAddress: "TE:ST:TE:ST:TE"});
    clientB.on("msg", (data) => {
      data.msg.should.equal("OK");
      done();
    });
    setTimeout(() => {
      clientA.emit('msg', {macAddress: "TE:ST:TE:ST:TE", msg: "OK"});
    }, 3000);
  });

  it('should cache message if client is disconnected and send when reconnected.', (done) => {
    clientB.emit('mac', {macAddress: "FF:FF:FF:FF:FF"});

    setTimeout(() => {
      clientB.close();
    }, 1000);

    setTimeout(() => {
      clientB.on('msg', (data) => {
        data.msg.should.equal("CACHED");
        done();
      });
      clientA.emit('msg', {macAddress: "FF:FF:FF:FF:FF", msg: "CACHED"});
      clientB.open();
      clientB.emit('mac', {macAddress: "FF:FF:FF:FF:FF"});
    }, 3000);
  });

});
