const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const User = require('../models/user');
const Pair = require('../models/pair');

const jsonParser = bodyParser.json();

router.post('/pairs', jsonParser, getUserAId, getUserBId, addPair);

function getUserAId(req, res, next) {
  User.findOne({macAddress: req.body.macAddressA})
  .exec((err, user) => {
    if (err) {
      console.log("ERROR: Could not search db.");
      res.json({'ERROR': err});
    } else if (!user) {
      console.log('INFO: User not found. Creating a new one...');
      let newUser = new User({
        macAddress: req.body.macAddressA,
        socketUuid: null
      });
      newUser.save((_err, data) => {
        if (_err) {
          console.log("ERROR: Could not save user.");
          res.json({'ERROR': _err});
        } else {
          console.log('INFO: Created new user with id ' + data.id);
          res.locals.userA_id = data.id;
          next();
        }
      });
    } else {
      console.log('INFO: Found user in DB.');
      res.locals.userA_id = user.id;
      next();
    }
  });
}

function getUserBId(req, res, next) {
  User.findOne({macAddress: req.body.macAddressB})
  .exec((err, user) => {
    if (err) {
      console.log("ERROR: Could not search db.");
      res.json({'ERROR': err});
    } else if (!user) {
      console.log('INFO: User not found. Creating a new one...');
      let newUser = new User({
        macAddress: req.body.macAddressB,
        socketUuid: null
      });
      newUser.save((_err, data) => {
        if (_err) {
          console.log("ERROR: Could not save user.");
          res.json({'ERROR': _err});
        } else {
          console.log('INFO: Created new user with id ' + data.id);
          res.locals.userB_id = data.id;
          next();
        }
      });
    } else {
      console.log('INFO: Found user in DB.');
      res.locals.userB_id = user.id;
      next();
    }
  });
}

function addPair(req, res) {
  let newPair = new Pair({
    userA: res.locals.userA_id,
    userB: res.locals.userB_id
  });
  newPair.save((err, pair) => {
    if (err) {
      res.json({'ERROR': err});
    } else {
      res.json({'SUCCESS': pair});
    }
  });
}

module.exports = router;
