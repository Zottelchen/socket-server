const express = require('express');
const router = express.Router();

router.get('/now', getStats, sendStats);

function getStats(req, res, next) {
    // Get number of users in collection
    // Get number of current users
    // Get GitHub downloads

    

    res.json(stats);
}

