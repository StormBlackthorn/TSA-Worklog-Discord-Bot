const {
	ApplicationCommandType
} = require('discord.js');

module.exports = {
	name: 'ping',
	description: "Check bot's ping.",
	category: "info",
	type: ApplicationCommandType.ChatInput,
	userPerms: [],
	botPerms: [],
	async run(client, interaction) {
		await interaction.reply(`🏓 Pong! Latency: **${Math.round(client.ws.ping)} ms**`)
	}
};


