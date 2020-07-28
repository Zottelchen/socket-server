const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');
const should = chai.should();
const User = require('../models/user');

chai.use(chaiHttp);

describe('Pairs', () => {

  after((done) => {
    try {
      User.collection.drop();
    } catch (e) {
      if (e.code === 26) {
        console.log('namespace %s not found', model.collection.name);
      } else {
        console.log("ERROR: Failed to drop collection!");
        throw e;
      }
    }
    done();
  });

  it('should add a new pair on /pairs POST', (done) => {
    chai.request(server)
      .post('/api/pairs')
      .send({
        'macAddressA': 'ff-ff-ff-ff-ff',
        'macAddressB': '00-00-00-00-00'
      })
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('SUCCESS');
        done();
      });
  });
});
