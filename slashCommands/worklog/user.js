const { ApplicationCommandType, ApplicationCommandOptionType, ModalBuilder, EmbedBuilder, LabelBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

const User = require("../../utils/models/user.js")();
const Worklog = require("../../utils/models/worklog.js")();

const { disableButtons } = require("../../utils/utils.js");

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
                    return await interaction.reply({
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
                    time: 180_000,
                }).then(async interaction => {
                    
                    const fullName = interaction.fields.getTextInputValue("fullName");
                    const user = await User.findOne({ name: fullName });

                    if(!user) return await interaction.reply({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle("Name Not Found")
                                    .setDescription(`We could not find a registered TSA member named ${fullName} in our database. Please ensure you entered your name exactly as you did when signing up for TSA.\nContact @Chthollygirl if you believe that this is a mistake.`)
                                    .setColor("Red")
                            ],
                            ephemeral: true
                        })

                    const response = await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Is this you?")
                                .setDescription(`We found a registered TSA member with the name \`${fullName} (${user.grade}th Grade)\`.\n\n**Email:** ${user.email}\n**Events:** ${user.events?.join(", ") ?? "None"}`)
                                .setColor("Gray")
                        ],
                        components: [
                            new ActionRowBuilder().addComponents(
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
                        ephemeral: true,
	                    withResponse: true,
                    })

                    await response.resource.message.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: 120_000 })
                        .then(async confirmationInteraction => {
                            if(confirmationInteraction.customId === "confirmProfileInit") {

                                await User.findOneAndUpdate({
                                    name: fullName
                                }, {
                                    discordId: interaction.user.id,
                                    signedUp: true,
                                });

                                await confirmationInteraction.update({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle("Profile Initialized")
                                            .setDescription("Your user profile has been successfully initialized!\nUse `/user view` to view your profile.")
                                            .setColor("Green")
                                    ],
                                    components: []
                                });

                                if(!user.worklogs) return;
                                
                                return await confirmationInteraction.followUp({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle("Worklogs Found")
                                            .setDescription("We found existing worklogs associated with your profile for the following events:\n- **" + user.events.join("**\n- **")+"**\nYou can view them using the `/worklog worklogs` command.")
                                            .setColor("Green")
                                    ]
                                })

                            } else {
                               return await confirmationInteraction.update({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle("Initialization Cancelled")
                                            .setDescription("Profile initialization has been cancelled. Please ensure you enter your name exactly as you did when signing up for TSA.\nYou may run the `/user init` command again to reattempt profile initialization.")
                                            .setColor("Red")
                                    ],
                                    components: []
                                });
                            }
                        })
                        .catch(async () => {
                            return await confirmationInteraction.update({
                                embeds: [
                                    new EmbedBuilder()
                                        .setTitle("Initialization Timed Out")
                                        .setDescription("You did not respond in time. Please run the `/user init` command again to reattempt profile initialization.")
                                        .setColor("Red")
                                ],
                                components: [disableButtons(response.resource.message.components[0].components)]
                            })
                        });

                })

                break;
        }
    }

}