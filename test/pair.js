const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');
const should = chai.should();

chai.use(chaiHttp);

describe('Pairs', () => {
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
        console.log(res.body);
        done();
      });
  });
});
