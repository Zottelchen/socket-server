const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/update', getTags, sendBinary);

// Get available tags from GitHub repository.
function getTags(req, res, next) {
  axios.get(process.env.GITHUB_FIRMWARE_REPOSITORY_API_URL)
  .then(response => {
    console.log("Latest release tag: " + response.data.tag_name + " | Asset URL: " + response.data.assets[0].browser_download_url);
    res.locals.release = response.data;
    next();
  })
  .catch(error => {
    console.log("ERROR: Could not retrieve tags from firmware repo.");
    console.log(error);
    res.sendStatus(500);
  });
}

// Check ESP version and send binary file.
function sendBinary(req, res) {
  let espVersion = req.get('x-ESP8266-version');
  console.log("INFO: Firmware version: " + espVersion);
  let latestVersion = res.locals.release.tag_name;
  console.log("INFO: Latest version: " + latestVersion);
  if (espVersion.charAt(0) === 'v') espVersion = espVersion.substring(1);
  if (latestVersion.charAt(0) === 'v') latestVersion = latestVersion.substring(1);
  if (versionCompare(espVersion, latestVersion) >= 0) {
    console.log("INFO: No update needed.");
    res.sendStatus(304);
  } else if (versionCompare(espVersion, latestVersion) < 0) {
    console.log("INFO: Update required");
    let downloadUrl = res.locals.release.assets[0].browser_download_url;
    axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'stream'
    })
    .then((response) => {
      response.data.pipe(res)
    });
  } else {
    console.log("WARN: semver comparison returned null. One of them is invalid! Returning 500...");
    res.sendStatus(500);
  }
}

// Compare two semver versions.
function versionCompare(v1, v2, options) {
  let lexicographical = options && options.lexicographical,
  zeroExtend = options && options.zeroExtend,
  v1parts = v1.split('.'),
  v2parts = v2.split('.');

  function isValidPart(x) {
    return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
  }

  if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
    return NaN;
  }

  if (zeroExtend) {
    while (v1parts.length < v2parts.length) v1parts.push("0");
    while (v2parts.length < v1parts.length) v2parts.push("0");
  }

  if (!lexicographical) {
    v1parts = v1parts.map(Number);
    v2parts = v2parts.map(Number);
  }

  for (let i = 0; i < v1parts.length; ++i) {
    if (v2parts.length == i) {
      return 1;
    }

    if (v1parts[i] == v2parts[i]) {
      continue;
    }
    else if (v1parts[i] > v2parts[i]) {
      return 1;
    }
    else {
      return -1;
    }
  }

  if (v1parts.length != v2parts.length) {
    return -1;
  }

  return 0;
}

module.exports = router;
