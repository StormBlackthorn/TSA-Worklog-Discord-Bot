const { ApplicationCommandType, ApplicationCommandOptionType } = require("discord.js");

require("discord.js");


module.exports = {
    name: "worklog",
    description: "Log your work hours and progresses!",
    userPerms: [],
    botPerms: [],
    type: ApplicationCommandType.ChatInput,
    options : [{
        name: "add",
        description: "Add to your worklog",
        type: ApplicationCommandOptionType.Subcommand
    }],

    async run(client, interaction) {
        switch(interaction.options.getSubcommand()) {
            case "log":
                await interaction.reply("Logging your work hours and progresses!");
                break;
        }
    }
}