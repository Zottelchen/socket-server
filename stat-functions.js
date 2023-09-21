const Stat = require("./models/stat");
const logger = require("./logger");

async function addToStat(stat_name, value) {
	// add value to stat_name in mongodb
	// if stat_name does not exist, create it
	logger.info(`Adding ${value} to ${stat_name}`);
	const stat = await Stat.findOne({ name: stat_name }).exec();
	if (stat) {
		logger.info(`Found stat ${stat_name} with value ${stat.stat}`);
		stat.stat += value;
		stat.save((err, data) => {
			if (err) {
				logger.error("Could not save stat.");
				logger.error(err);
			}
			/* 	else {
				logger.info(`Saved stat ${stat_name} with value ${stat.stat}`);
			}*/
		});
	} else {
		logger.info(`Could not find stat ${stat_name}`);
		const newStat = Stat({
			name: stat_name,
			stat: value,
		});
		newStat.save((err, data) => {
			if (err) {
				logger.error("Could not save stat.");
				logger.error(err);
			}
			/* 	else {
				logger.info(`Saved stat ${stat_name} with value ${newStat.stat}`);
			} */
		});
	}
}

async function getStat(stat_name) {
	const stat = await Stat.findOne({ name: stat_name }).exec();
	if (stat) {
		return stat.stat;
	} else {
		return 0;
	}
}

async function getAllStats() {
	const stats = await Stat.find().exec();
	console.log(stats);
	return stats;
}

module.exports = { addToStat, getStat, getAllStats };
