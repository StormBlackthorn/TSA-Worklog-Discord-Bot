const {
	EmbedBuilder,
	PermissionsBitField,
	Interaction
} = require('discord.js');
const { client } = require("../index.js");

/** 
 * @param {Interaction} interaction
 */


module.exports = {
	event: 'interactionCreate',
	async run(interaction) {
		const slashCommand = client.slashCommands.get(interaction.commandName);
		if (interaction.type === 4) {
			if (slashCommand.autocomplete) {
				const choices = [];
				await slashCommand.autocomplete(interaction, choices)
			}
		}
		if (!interaction.type === 2) return;

		if (!slashCommand) return client.slashCommands.delete(interaction.commandName);
		try {
			if (slashCommand.userPerms || slashCommand.botPerms) {
				if (!interaction.memberPermissions.has(PermissionsBitField.resolve(slashCommand.userPerms || []))) {
					const userPerms = new EmbedBuilder()
						.setDescription(`🚫 ${interaction.user}, You don't have \`${slashCommand.userPerms}\` permissions to use this command!`)
						.setColor('Red')
					return interaction.reply({
						embeds: [userPerms]
					})
				}
				if (!interaction.guild.members.cache.get(client.user.id).permissions.has(PermissionsBitField.resolve(slashCommand.botPerms || []))) {
					const botPerms = new EmbedBuilder()
						.setDescription(`🚫 ${interaction.user}, I don't have \`${slashCommand.botPerms}\` permissions to use this command!`)
						.setColor('Red')
					return interaction.reply({
						embeds: [botPerms]
					})
				}

			}
			await slashCommand.run(client, interaction);
		} catch (error) {
			console.log(error);
		}
	}
}