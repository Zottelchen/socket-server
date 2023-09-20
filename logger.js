const pino = require("pino");

// Define logger options
const loggerOptions = {
	transport:
		process.env.PRETTY_LOGGING === "true"
			? {
					target: "pino-pretty",
					options: {
						colorize: true,
					},
			  }
			: undefined,
};

// Create the logger with the defined options
const logger = pino(loggerOptions);

// Export the logger
module.exports = logger;
