const { ApplicationCommandType, ApplicationCommandOptionType } = require("discord.js");

module.exports = {
    name: "help",
    description: "Get a list of all commands or information about a specific command",
    type: ApplicationCommandType.ChatInput,
    options: [{
        name: "command",
        description: "Get information about a specific command",
        type: ApplicationCommandOptionType.Subcommand,
        autoComplete: true,
        required: false
    }],
    
    async autoComplete(interaction) {

    },

    async run(client, interaction) {
        switch(interaction.options.getSubcommand()) {
            case "command":
                await interaction.reply({ content: "uhhh work in progress cuz I'm too lazy to add this rn", ephemeral: true });
                break;
        }
    }
}