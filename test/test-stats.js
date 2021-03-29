process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');
const User = require('../models/user');
const should = chai.should();

const io = require('socket.io-client');
const socketUrl = 'http://localhost:5000';
const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

chai.use(chaiHttp);

let clientA = null, clientB = null;

describe('Stats', () => {

    before((done) => {
        clientA = io(socketUrl, ioOptions);
        clientB = io(socketUrl, ioOptions);

        clientA.emit('mac', {macAddress: "TE:ST:TE:ST:ST"});
        clientB.emit('mac', {macAddress: "TE:ST:TE:ST:TE"});

        done();
    });
    
    after((done) => {
        User.countDocuments({}, (numOfDocuments) => {
            if (numOfDocuments)
                User.collection.drop();
        });
        done();
    });

    it('should GET stats', (done) => {
        chai.request(server)
        .get('/stats/now')
        .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.users.should.not.equal(0);
            res.body.usersOnline.should.not.equal(0);
            res.body.downloads[0].should.have.property('download_count');
            done();
        });
    });
});