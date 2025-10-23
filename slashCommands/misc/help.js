const { ApplicationCommandType, ApplicationCommandOptionType } = require("discord.js");

module.exports = {
    name: "help",
    description: "Get a list of all commands or information about a specific command",
    type: ApplicationCommandType.ChatInput,
    options: [{
        name: "command",
        description: "Get information about a specific command",
        type: ApplicationCommandOptionType.Subcommand
    }],

    async run(client, interaction) {
        switch(interaction.options.getSubcommand()) {
            case "command":
                await interaction.reply("");
                break;
        }
    }
}