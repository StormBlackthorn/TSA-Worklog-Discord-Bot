const {
	ActivityType
} = require('discord.js');
const client = require("..");
const chalk = require('chalk');

module.exports = {
	event: 'clientReady',
	run() {

		client.user.setStatus('online');
		client.user.setActivity({
			name: "Grinding TSA?",
			type: ActivityType.Watching
		});
		console.log(chalk.red(`Logged in as ${client.user.tag}!`))
	}
}