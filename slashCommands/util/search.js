const { Events } = require("../../utils/utils.js");
const {
    ApplicationCommandType,
    ApplicationCommandOptionType,
    EmbedBuilder,
    MessageFlags,
    ContainerBuilder,
    ButtonStyle,
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
        name: "event",
        description: "Show all competitors for an event",
        type: ApplicationCommandOptionType.Subcommand,
        options: [{
            name: "event_name",
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
                    Events.allMembers.filter(choice => choice.toLowerCase().includes(focusedOption.value.toLowerCase()))
                    .slice(0, 7)
                    .map(choice => ({ name: choice, value: choice }))
                );
                break;
            case "event_name":
                await interaction.respond(
                    Events.allEvents.filter(choice => choice.toLowerCase().includes(focusedOption.value.toLowerCase()))
                    .slice(0, 7)
                    .map(choice => ({ name: choice, value: choice }))
                );
                break;
        }   

        
    },

    async run(client, interaction) {
        switch(interaction.options.getSubcommand()) {
            case "user": {
                const name    = interaction.options.getString("name"),
                      results = Events.getEventsFromMember(name);

                //invalid name entered
                if(!results) return await interaction.reply({
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
                    .addTextDisplayComponents(t => t.setContent(`## Events for *${name}*:`))
                    .addSeparatorComponents(s => s);
                
                results.forEach(event => {

                    const teammates = Events.getEventMembersFromEvent(event)
                        ?.find(group => group.includes(name))
                        ?.filter(teammate => teammate !== name)
                        .join(", ") || "Solo";

                    container.addSectionComponents(section => section
                        .addTextDisplayComponents(
                            t => t.setContent(`### **${event}**`),
                            t => t.setContent(`> **Teammates:** *${teammates}*`)
                        )
                        .setButtonAccessory((button) => button.setLabel("Event Rubric").setStyle(ButtonStyle.Link).setURL("https://www.youtube.com/watch?v=dQw4w9WgXcQ")),
                    );

                    container.addSeparatorComponents(s => s.setDivider(false))

                });
                

                return await interaction.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                });

                break;
            }

            case "event": {
                const eventName = interaction.options.getString("event_name");

                if(!Events.allEvents.includes(eventName)) return await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Invalid event")
                            .setDescription(`**${eventName}** is not a valid event.`)
                            .setColor("Red")
                    ],
                    ephemeral: true
                });

                const teams = Events.getEventMembersFromEvent(eventName);

                const container = new ContainerBuilder()
                    .setAccentColor(0x06ec98)
                    .addSectionComponents(section => section
                        .addTextDisplayComponents(t => t.setContent(`## Competitors for __${eventName}__ *(${teams.length} teams)*:`))
                        .setButtonAccessory((button) => button.setLabel("Event Rubric").setStyle(ButtonStyle.Link).setURL("https://www.youtube.com/watch?v=dQw4w9WgXcQ"))
                    )
                    .addSeparatorComponents(s => s);

                teams.forEach((group, index) => {
                    container.addTextDisplayComponents(t =>
                        t.setContent(`**${index + 1}.** *${group.join(", ")}*`)
                    );
                    container.addSeparatorComponents(s => s.setDivider(false));
                });

                return await interaction.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                });

                break;
            }
        }
    }
}

