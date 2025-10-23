const { ApplicationCommandType, ApplicationCommandOptionType } = require("discord.js");

module.exports = {
    name: "user",
    description: "Set up and manage your user profile!",
    type: ApplicationCommandType.ChatInput,
    options : [{
        name: "init",
        description: "Initialize your user profile",
        type: ApplicationCommandOptionType.Subcommand
    }, {
        name: "settings",
        description: "View/Modify your user settings",
        type: ApplicationCommandOptionType.Subcommand
    }, {
        name: "view",
        description: "View your user profile, which displays information such as you worklogs and events.",
        type: ApplicationCommandOptionType.Subcommand
    }],

    async run(client, interaction) {
        switch(interaction.options.getSubcommand()) {
            case "":
                await interaction.reply("");
                break;
        }
    }

}