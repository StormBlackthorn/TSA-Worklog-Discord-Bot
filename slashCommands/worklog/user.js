const { 
    ApplicationCommandType, 
    ApplicationCommandOptionType, 
    ModalBuilder, 
    EmbedBuilder, 
    LabelBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const User = require("../../utils/models/user.js")();
const Worklog = require("../../utils/models/worklog.js")();

const { Message, Errors } = require("../../utils/utils.js");

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
        description: "View your private user profile, which displays information such as you worklogs and emails. Only you can see this information.",
        type: ApplicationCommandOptionType.Subcommand
    }, {
        name: "profile",
        description: "Displays your public profile, which includes current/past events and significant placements.",
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
                        .setCustomId("userProfileInitModal")
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
                }).then(async modalInteraction => {
                    
                    const fullName = modalInteraction.fields.getTextInputValue("fullName");
                    const user = await User.findOne({ name: fullName }).collation({ locale: 'en', strength: 1 });

                    if(!user) return await modalInteraction.reply({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle("Name Not Found")
                                    .setDescription(`We could not find a registered TSA member named \`${fullName}\` in our database. Please ensure you entered your name exactly as you did when signing up for TSA.\nContact @Chthollygirl if you believe that this is a mistake.`)
                                    .setColor("Red")
                            ],
                            ephemeral: true
                        })

                    if(user.signedUp) return await modalInteraction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Profile Already Initialized")
                                .setDescription(`The TSA member profile for \`${fullName}\` has already been initialized with the Discord account <@${user.discordId}>.`)
                                .setColor("Red")
                        ],
                        ephemeral: true
                    })

                    const response = await modalInteraction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Is this you?")
                                .setDescription(`We found a registered TSA member with the name ***${user.name}***.\n**Grade:** ${user.grade}\n**School Email:** ${user.email[0]}\n**Events:** *${user.events?.join(", ") ?? "None"}*`)
                                .setColor("Grey")
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

                    await response.resource.message.awaitMessageComponent({ filter: i => i.user.id === modalInteraction.user.id, time: 120_000 })
                        .then(async confirmationInteraction => {
                            if(confirmationInteraction.customId === "confirmProfileInit") {


                                user.discordId = modalInteraction.user.id;
                                user.signedUp = true;
                                await user.save();

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
                                            .setDescription("We found existing worklogs associated with your profile for the following events:\n- **" + user.events.join("**\n- **")+"**\nYou can view them using the `/worklog worklogs list` command.")
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
                        .catch(async (e) => {
                            Errors.timeOut(modalInteraction, e);

                            return await modalInteraction.editReply({
                                components: [new ActionRowBuilder({components: Message.disableButtons(response.resource.message.components[0].components)})]
                            })

                        });

                }).catch(async (e) => Errors.timeOut(interaction, e));

                break;
            case "settings":
            case "view":
            case "profile":
            case "delete":
                if(!(await User.exists({ discordId: interaction.user.id }))) {
                    return await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Profile Not Initialized")
                                .setDescription("You have not initialized your user profile. Please run the `/user init` command to set up your profile.")
                                .setColor("Red")
                    ], ephemeral: true });
                }

                const user = await User.findOne({ discordId: interaction.user.id });

                //no break, fall through to respective cases if user exists
            case "settings":
                return await interaction.reply("User settings command is under development.");
                break;
            case "view":
                
                return await interaction.reply({
                    components: [

                    ],
                    ephemeral: true
                });
                break;
            case "profile":
                return await interaction.reply("User profile command is under development.");
                break;
            case "delete":
                return await interaction.reply("User delete command is under development.");
                break;
        }
    }

}