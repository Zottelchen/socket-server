const express = require("express");
const axios = require("axios");
const fs = require("fs");
const router = express.Router();
const logger = require("../logger");

router.get("/update/:slug", getUrl, getTags, sendBinary);
router.get("/projects", getProjects);

function getProjects(req, res) {
	res.sendFile("./projects.json", { root: __dirname });
}

function getUrl(req, res, next) {
	fs.readFile(`${__dirname}/projects.json`, (err, data) => {
		if (err) throw err;
		const projectsDocument = JSON.parse(data);
		res.locals.project = projectsDocument.projects.find((project) => {
			return project.slug === req.params.slug;
		});
		if (res.locals.project !== undefined) {
			logger.info(res.locals.project.releaseUrl);
			next();
		} else {
			res.sendStatus(400);
		}
	});
}

// Get available tags from GitHub repository.
function getTags(req, res, next) {
	axios
		.get(res.locals.project.releaseUrl)
		.then((response) => {
			res.locals.release = response.data[0];
			res.locals.asset = res.locals.release.assets.find((asset) => {
				return asset.name === "app.bin";
			});
			if (res.locals.asset === undefined) {
				logger.warn("WARN: No app.bin found in release assets!");
				res.sendStatus(500);
			}

			logger.info(`Latest release tag: ${res.locals.release.tag_name} | Asset URL: ${res.locals.asset.browser_download_url}`);

			next();
		})
		.catch((error) => {
			logger.error("Could not retrieve tags from firmware repo.");
			logger.error(error);
			res.sendStatus(500);
		});
}

// Check ESP version and send binary file.
async function sendBinary(req, res) {
	let espVersion = req.get("x-ESP32-version");
	logger.info(`Firmware version: ${espVersion}`);
	let latestVersion = res.locals.release.tag_name;
	logger.info(`Latest version: ${latestVersion}`);
	if (espVersion === undefined) {
		logger.warn("Device did not send firmware version.");
		res.sendStatus(400);
	}
	if (espVersion.charAt(0) === "v") espVersion = espVersion.substring(1);
	if (latestVersion.charAt(0) === "v") latestVersion = latestVersion.substring(1);
	if (versionCompare(espVersion, latestVersion) >= 0) {
		logger.info("No update needed.");
		res.sendStatus(304);
	} else if (versionCompare(espVersion, latestVersion) < 0) {
		const downloadUrl = res.locals.asset.browser_download_url;
		logger.info(`Update required with url ${downloadUrl}`);
		res.json({ downloadUrl: downloadUrl });
	} else {
		logger.warn("semver comparison returned null. One of them is invalid! Returning 500...");
		res.sendStatus(500);
	}
}

// Compare two semver versions.
function versionCompare(v1, v2, options) {
	const lexicographical = options?.lexicographical;
	const zeroExtend = options?.zeroExtend;
	let v1parts = v1.split(".");
	let v2parts = v2.split(".");

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
		if (v2parts.length === i) {
			return 1;
		}

		if (v1parts[i] === v2parts[i]) {
			continue;
		} else if (v1parts[i] > v2parts[i]) {
			return 1;
		} else {
			return -1;
		}
	}

	if (v1parts.length !== v2parts.length) {
		return -1;
	}

	return 0;
}

module.exports = router;
