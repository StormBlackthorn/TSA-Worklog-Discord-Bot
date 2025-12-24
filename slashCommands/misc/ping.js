const {
	ApplicationCommandType,
} = require('discord.js');

module.exports = {
	name: 'ping',
	description: "Check bot's ping.",
	type: ApplicationCommandType.ChatInput,
	async run(client, interaction) {
		await interaction.reply({ content: `🏓 Pong! Latency: **${Math.round(client.ws.ping)} ms**`, ephemeral: true })
	}
};


