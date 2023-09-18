const Stat = require("./models/stat");

async function addToStat(stat_name, value) {
	// add value to stat_name in mongodb
	// if stat_name does not exist, create it
	console.log(`INFO: Adding ${value} to ${stat_name}`);
	const stat = await Stat.findOne({ name: stat_name }).exec();
	if (stat) {
		console.log(`INFO: Found stat ${stat_name} with value ${stat.stat}`);
		stat.stat += value;
		stat.save((err, data) => {
			if (err) {
				console.log("ERROR-4: Could not save stat.");
				console.log(err);
			}
			/* 	else {
				console.log(`INFO: Saved stat ${stat_name} with value ${stat.stat}`);
			}*/
		});
	} else {
		console.log(`INFO: Could not find stat ${stat_name}`);
		const newStat = Stat({
			name: stat_name,
			stat: value,
		});
		newStat.save((err, data) => {
			if (err) {
				console.log("ERROR-5: Could not save stat.");
				console.log(err);
			}
			/* 	else {
				console.log(`INFO: Saved stat ${stat_name} with value ${newStat.stat}`);
			} */
		});
	}
}

module.exports = { addToStat };
