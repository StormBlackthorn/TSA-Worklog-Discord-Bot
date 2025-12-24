const {
	InteractionType
} = require('discord.js');

const { client } = require("../index.js");

const { Errors } = require("../utils/utils.js");


module.exports = {
	event: 'interactionCreate',
	async run(interaction) {
		const slashCommand = client.slashCommands.get(interaction.commandName);

		if (interaction.isAutocomplete()) return slashCommand.autoComplete(interaction);

		if (interaction.type !== InteractionType.ApplicationCommand) return;

		await slashCommand.run(client, interaction).catch(error => 
			Errors.errorMessage({
				stack: error.stack,
				content: error,
				title: "SlashCommand Error",
				interaction: interaction,
				followUp: true
			})
		);
	}
}