process.env.NODE_ENV = 'test';

const chai = require('chai');
const server = require('../server');
const http = require('http');
const should = chai.should();
const io = require('socket.io-client');
const User = require('../models/user');
const Pair = require('../models/pair');

let uA, uB, p = null;


const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

describe('socket.io server', () => {
  before((done) => {
    let userA = new User({
      macAddress: '00-00-00-00-00',
      socketId: null
    });
    let userB = new User({
      macAddress: 'ff-ff-ff-ff-ff',
      socketId: null
    });
    userA.save((err, _userA) => {
      userB.save((_err, _userB) => {
        let pair = new Pair({
          userA: _userA.id,
          userB: _userB.id
        });
        pair.save((__err, _pair) => {
          uA = _userA;
          uB = _userB;
          p = _pair;
          done();
        });
      });
    });
  });

  after((done) => {
    for (let model of [User, Pair]) {
      try {
        model.collection.drop();
      } catch (e) {
        if (e.code === 26) {
          console.log('namespace %s not found', model.collection.name);
        } else {
          console.log("ERROR: Failed to drop collection!");
          throw e;
        }
      }
    }
    done();
  });

  it('should connect to the server', (done) => {
    const socket = io("http://localhost:5000");
    socket.on('connect', () => {
      console.log(socket);
      socket.connected.should.equal(true);
      done();
    });
  });

  it('should get OK from server when sending message to pair user', (done) => {

  });

  it('should get DISC from server when sending message to disconnected pair user', (done) => {

  });

  it('should get ERR from server when user is not registered', (done) => {

  });

});
