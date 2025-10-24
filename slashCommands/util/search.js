const { getEventsFromMember, allMembers, allEvents } = require("../../utils/utils.js");
const {
    ApplicationCommandType,
    ApplicationCommandOptionType,
    EmbedBuilder,
    MessageFlags,
    ContainerBuilder,
    ButtonStyle
} = require("discord.js");

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
    }, {
        options: "event",
        description: "Show all competitors for an event",
        type: ApplicationCommandOptionType.Subcommand,
        options: [{
            name: "eventName",
            description: "The event name you want to search for",
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
                    allMembers.filter(choice => choice.toLowerCase().includes(focusedOption.value.toLowerCase()))
                    .slice(0, 7)
                    .map(choice => ({ name: choice, value: choice }))
                );
                break;
            case "event":
                await interaction.respond(
                    allEvents.filter(choice => choice.toLowerCase().includes(focusedOption.value.toLowerCase()))
                    .slice(0, 7)
                    .map(choice => ({ name: choice, value: choice }))
                );
                break;
        }   

        
    },

    async run(client, interaction) {
        switch(interaction.options.getSubcommand()) {
            case "user":
                const name    = name,
                      results = getEventsFromMember(name);

                if(results === -1) return await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Invalid member")
                            .setDescription(`**${name}** is not a member of North Creek TSA.`)
                            .setColor("Red")
                    ],
                    ephemeral: true
                });

                const container = new ContainerBuilder()
                    .setAccentColor(0x0099ff)
                
                if(results.length > 0) {
                    results.forEach(event => {

                        const teammates = getEventMembersFromEvent(event)
                            .find(group => group.includes(name))
                            ?.filter(name => name !== name)
                            .join(", ") || "Solo";

                        container.addSectionComponents(section => section
                            .addTextDisplayComponents(
                                t => t.setContent(`**${event}**`),
                                t => t.setContent(`> **Teammates:** *${teammates}*`)
                            )
                            .setButtonAccessory((button) => button.setLabel("View Event Rubric").setStyle(ButtonStyle.Link).setURL()),
                        );

                        container.addSeparatorComponents(s => s)

                    });
                } else {
                    container.addTextDisplayComponents(t => {
                        t.setContent(`**${name}** is not registered for any events.`)
                    })
                }

                return await interaction.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                });

                break;

            case "event":
                const eventName = interaction.options.getString("eventName");

                if(!allEvents.includes(eventName)) return await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Invalid event")
                            .setDescription(`**${eventName}** is not a valid event.`)
                            .setColor("Red")
                    ],
                    ephemeral: true
                });

                const embed = new EmbedBuilder()
                    .setColor("Aqua");

                let description = "";
                const teams = getEventMembersFromEvent(eventName);
                
                teams.forEach((group, index) => description += `**Team ${index + 1}: ** *${group.join(", ")}*\n`);

                embed.setDescription(description)
                     .setTitle(`Competitors for **${eventName}** *(${teams.length} teams)*`);

                return await interaction.reply({
                    embeds: [embed]
                })


                break;
        }
    }
}