const { ApplicationCommandType, ApplicationCommandOptionType, ModalBuilder, EmbedBuilder, LabelBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

const User = require("../../utils/models/user.js")();
const Worklog = require("../../utils/models/worklog.js")();

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
    }, {
        name: "profile",
        description: "Displays your public profile, which includes current/past events and significant placements",
        type: ApplicationCommandOptionType.Subcommand
    }, {
        name: "delete",
        description: "Delete your user profile and all associated data (worklogs, etc). This action is irreversible.",
        type: ApplicationCommandOptionType.Subcommand
    }],

    async run(client, interaction) {
        switch(interaction.options.getSubcommand()) {
            case "init":
                
                if(await User.exists({ discordId: interaction.user.id })) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Profile Already Initialized")
                                .setDescription("You have already initialized your user profile.")
                                .setColor("Red")
                    ], ephemeral: true });
                }

                await interaction.showModal(
                    new ModalBuilder()
                        .setTitle("Initialize Your User Profile")
                        .addLabelComponents(
                            new LabelBuilder()
                                .setLabel("Full Name")
                                .setDescription("Please enter your full name, the same as the one you used when signing up for TSA.")
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("fullName")
                                        .setStyle(TextInputStyle.Short)
                                        .setPlaceholder("Your full name")
                                        .setRequired(true)
                                )
                        )
                )

                interaction.awaitModalSubmit({
                    time: 3 * 60 * 1000,
                }).then(async interaction => {
                    
                    const fullName = interaction.fields.getTextInputValue("fullName");
                    const user = await User.findOne({ name: fullName });

                    if(!user) return interaction.reply({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle("Name Not Found")
                                    .setDescription(`We could not find a registered TSA member named ${fullName} in our database. Please ensure you entered your name exactly as you did when signing up for TSA.\nContact @Chthollygirl if you believe that this is a mistake.`)
                                    .setColor("Red")
                            ],
                            ephemeral: true
                        })

                    interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Is this you?")
                                .setDescription(`We found a registered TSA member with the name \`${fullName} (${user.grade}th Grade)\`.\n\n**Email:** ${user.email}\n**Events:** ${user.events?.join(", ") ?? "None"}`)
                                .setColor("Green")
                        ],
                        components: [
                            new ActionRowBuilder()().addComponents(
                                new ButtonBuilder()
                                    .setCustomId("confirmProfileInit")
                                    .setLabel("Yes")
                                    .setStyle(ButtonStyle.Success),
                                new ButtonBuilder()
                                    .setCustomId("denyProfileInit")
                                    .setLabel("No")
                                    .setStyle(ButtonStyle.Danger)
                            )
                        ],
                        ephemeral: true
                    })

                })

                await User.create({

                })

                break;
        }
    }

}