const { getEventsFromMember, getAllMembers } = require("../../utils/utils.js");
const {
    ApplicationCommandType,
    ApplicationCommandOptionType
} = require("discord.js");

const {} = require("../../utils/utils.js");

module.exports = {
    name: "search",
    description: "Get information about a specific event or member!",
    type: ApplicationCommandType.ChatInput,
    options : [{
        name: "user",
        description: "Search for a user by name",
        type: ApplicationCommandOptionType.Subcommand,
        options: [{
            name: "name",
            description: "The name of the user to search for",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        }]
    }],
    async autoComplete(interaction) {

        const focusedOption = interaction.options.getFocused(true);

        switch(focusedOption.name) {
            case "name":
                await interaction.respond(
                    getAllMembers().filter(choice => choice.toLowerCase().includes(focusedOption.value.toLowerCase()))
                    .slice(0, 7)
                    .map(choice => ({ name: choice, value: choice }))
                );
                break;
        }   

        
    },

    async run(client, interaction) {
        switch(interaction.options.getSubcommand()) {
            case "user":
                const results = getEventsFromMember(interaction.options.getString("name"));
                await interaction.reply(results.length === 0 ? "Invalid member" : results.toString());
                break;
        }
    }
}