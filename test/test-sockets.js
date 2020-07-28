process.env.NODE_ENV = 'test';

const chai = require('chai');
const server = require('../server');
const http = require('http');
const should = chai.should();
const io = require('socket.io-client');
const User = require('../models/user');

describe('socket.io server', () => {
  let socketA, socketB;

  afterEach((done) => {
    socketA && socketA.connected && socketA.disconnect();
    socketB && socketB.connected && socketB.disconnect();
    done();
  });

  before((done) => {
    const newUser = User({
      macAddress: '0a:0a:0a:0a:0a',
      socketUuid: null
    });
    newUser.save((err) => {
      if (!err) {
        done();
      }
    })
  })

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
    socketA = io('http://localhost:5000',
      {"forceNew": true, "query": '', "transports": ["polling","websocket"]});
    socketA.on('connect', () => {
      done();
    });
  });

  it('should receive mac on connect', (done) => {
    socketA.on('send mac', (data) => {
      console.log(data);
      data.should.equal('');
      done();
    });
  });

  it('should send message from user a to user b successfully', (done) => {

  });

});
