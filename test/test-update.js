process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');
const should = chai.should();

chai.use(chaiHttp);

describe('Root', () => {

  it('should GET projects JSON', (done) => {
    chai.request(server)
      .get('/projects')
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.have.property('projects');
        res.body.projects.should.be.a('array');
        res.body.projects[0].should.have.property('name');
        res.body.projects[0].should.have.property('releaseUrl');
        done();
      });
  });

  /*

  it('should return the latest binary URL from GitHub', (done) => {
    chai.request(server)
    .get('/update/ESP32-SOCKETIO')
    .set('x-ESP32-version', 'v0.1')
    .end((err, res) => {
      res.should.have.status(200);
      console.log(res.body);
      res.body.downloadUrl.should.contain("/interactionresearchstudio/");
      done();
    });
  });

  it('should return a 304 when no update is required', (done) => {
    chai.request('https://api.github.com')
    .get('/repos/interactionresearchstudio/ESP32-SOCKETIO/releases')
    .end((err, res) => {
      chai.request(server)
      .get('/update/ESP32-SOCKETIO')
      .set('x-ESP32-version', res.body[0].tag_name)
      .end((_err, _res) => {
        _res.should.have.status(304);
        done();
      });
    });
  });

  it('should return a 304 when the device version is higher than the GitHub version', (done) => {
    chai.request(server)
    .get('/update/ESP32-SOCKETIO')
    .set('x-ESP32-version', 'v100.0')
    .end((err, res) => {
      res.should.have.status(304);
      done();
    });
  });

  it('should return a 500 if one of the semvers is invalid', (done) => {
    chai.request(server)
    .get('/update/ESP32-SOCKETIO')
    .set('x-ESP32-version', 'v1a.0f')
    .end((err, res) => {
      res.should.have.status(500);
      done();
    });
  });
  */
});
