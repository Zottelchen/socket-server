const express = require('express');
const axios = require('axios');
const fs = require('fs');
const router = express.Router();

router.get('/update/:slug', getUrl, getTags, sendBinary);
router.get('/projects', getProjects);

function getProjects(req, res) {
  res.sendFile('./projects.json', { root: __dirname });
}

function getUrl(req, res, next) {
  fs.readFile(__dirname + '/projects.json', (err, data) => {
    if (err) throw err;
    let projectsDocument = JSON.parse(data);
    res.locals.project = projectsDocument.projects.find(project => {
      return project.slug === req.params.slug;
    });
    if (res.locals.project !== undefined) {
      console.log(res.locals.project.releaseUrl);
      next();
    } else {
      res.sendStatus(400);
    }
  });
}

// Get available tags from GitHub repository.
function getTags(req, res, next) {
  axios.get(res.locals.project.releaseUrl)
  .then(response => {
    res.locals.release = response.data[0];
    res.locals.asset = res.locals.release.assets.find(asset => {
      return asset.name === "app.bin";
    });
    if (res.locals.asset === undefined) {
      console.log("WARN: No app.bin found in release assets!");
      res.sendStatus(500);
    }

    console.log("INFO: Latest release tag: " + res.locals.release.tag_name + " | Asset URL: " + res.locals.asset.browser_download_url);

    next();
  })
  .catch(error => {
    console.log("ERROR: Could not retrieve tags from firmware repo.");
    console.log(error);
    res.sendStatus(500);
  });
}

// Check ESP version and send binary file.
async function sendBinary(req, res) {
  let espVersion = req.get('x-ESP32-version');
  console.log("INFO: Firmware version: " + espVersion);
  let latestVersion = res.locals.release.tag_name;
  console.log("INFO: Latest version: " + latestVersion);
  if (espVersion == undefined) {
    console.log("WARN: Device did not send firmware version.");
    res.sendStatus(400);
  }
  if (espVersion.charAt(0) === 'v') espVersion = espVersion.substring(1);
  if (latestVersion.charAt(0) === 'v') latestVersion = latestVersion.substring(1);
  if (versionCompare(espVersion, latestVersion) >= 0) {
    console.log("INFO: No update needed.");
    res.sendStatus(304);
  } else if (versionCompare(espVersion, latestVersion) < 0) {
    console.log("INFO: Update required");

    let downloadUrl = res.locals.asset.browser_download_url;

    axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'stream'
    })
    .then((response) => {
      if (response.data) {
        console.log("INFO: Piping file to device...");
        response.data.pipe(res);
      }
    })
    .catch((error) => {
      console.log("ERROR: Could not get bin file from GitHub.");
      console.log(error);
      res.sendStatus(500);
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
