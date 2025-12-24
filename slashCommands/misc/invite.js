const { 
    ApplicationCommandType, 
    ButtonStyle, 
    ActionRowBuilder, 
    ButtonBuilder, 
    EmbedBuilder 
} = require("discord.js");

module.exports = {
    name: "invite",
    description: "Get the bot's invite link",
    type: ApplicationCommandType.ChatInput,

    async run(client, interaction) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Invite Me!")
                    .setAuthor({
                        name: client.user.username,
                        iconURL: client.user.displayAvatarURL(),
                        url: "https://github.com/StormBlackthorn/TSA-Worklog-Discord-Bot"
                    })
                    .setColor("Aqua")
                    .setDescription("Thank you for wanting to invite me! <3\nTime to elevate your worklog experience!")
                    .setFooter({
                        text: interaction.user.username,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setTimestamp()
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents([
                        new ButtonBuilder()
                            .setLabel("Invite Link")
                            .setStyle(ButtonStyle.Link)
                            .setURL(`https://discord.com/oauth2/authorize?client_id=1423882830932480055`),
                        new ButtonBuilder()
                            .setLabel("GitHub Repository")
                            .setStyle(ButtonStyle.Link)
                            .setURL("https://github.com/StormBlackthorn/TSA-Worklog-Discord-Bot")
                    ]),
                new ActionRowBuilder()
                    .addComponents([
                        new ButtonBuilder()
                            .setLabel("Unofficial NCHS TSA Server")
                            .setStyle(ButtonStyle.Link)
                            .setURL("https://discord.gg/ynKMrZg7RK"),
                    ])
            ],
        })
    }
}