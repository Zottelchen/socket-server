const express = require("express");
const axios = require("axios");
const fs = require("fs");
const router = express.Router();
const User = require("../models/user");
const logger = require("../logger");

router.get("/now", getProjectStats, getFirmwareUploaderStats, getUserStats, sendStats);

function getProjectStats(req, res, next) {
	res.locals.stats = {
		downloads: [],
	};

	// Get projects
	fs.readFile(`${__dirname}/projects.json`, (err, data) => {
		if (err) {
			logger.error("could not read file.");
			logger.error(err);
			res.sendStatus(500);
		}
		// Get download stats for each project
		const projectsDoc = JSON.parse(data);
		projectsDoc.projects.forEach((project, index) => {
			getAssetDownloads(project.releaseUrl, "app-combined.bin", (total) => {
				// Push download stats to json object
				res.locals.stats.downloads.push({
					name: project.name,
					slug: project.slug,
					download_count: total,
				});
				if (index === projectsDoc.projects.length - 1) {
					next();
				}
			});
		});
	});
}

function getFirmwareUploaderStats(req, res, next) {
	// Get download stats for Yo-Yo Machines Firmware Uploader
	getAssetDownloads("https://api.github.com/repos/interactionresearchstudio/esptool-python-gui/releases", "YoYoMachines-Firmware-Uploader.app.zip", (total) => {
		res.locals.stats.downloads.push({
			name: "Yo-Yo Machines Firmware Uploader - MacOS",
			slug: "esptool-python-gui",
			downloadCount: total,
		});
		getAssetDownloads("https://api.github.com/repos/interactionresearchstudio/esptool-python-gui/releases", "YoYoMachines-Firmware-Uploader.exe.zip", (_total) => {
			res.locals.stats.downloads.push({
				name: "Yo-Yo Machines Firmware Uploader - Windows",
				slug: "esptool-python-gui",
				downloadCount: _total,
			});
			next();
		});
	});
}

function getAssetDownloads(url, assetName, callback) {
	axios
		.get(url)
		.then((_res) => {
			const releases = _res.data;
			let totalDownloads = 0;
			releases.forEach((release) => {
				// Get downloads for each release
				release.assets.forEach((asset) => {
					if (asset.name === assetName) totalDownloads += asset.download_count;
				});
			});
			callback(totalDownloads);
		})
		.catch((err) => {
			logger.error("Error requesting releases from GitHub API.");
			logger.error(err);
			res.sendStatus(500);
		});
}

function getUserStats(req, res, next) {
	User.countDocuments({ socketUuid: null }).exec((err, usersOnline) => {
		if (err) {
			logger.error("Could not count.");
			res.sendStatus(500);
		} else {
			res.locals.stats.usersOnline = usersOnline;
		}
		User.countDocuments({}).exec((err, users) => {
			if (err) {
				logger.error("Could not count.");
				res.sendStatus(500);
			} else {
				res.locals.stats.users = users;
				next();
			}
		});
	});
}

function sendStats(req, res) {
	res.json(res.locals.stats);
}

module.exports = router;
