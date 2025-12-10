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
    ButtonStyle,
} = require("discord.js");

const User = require("../../utils/models/user.js")();
const Worklog = require("../../utils/models/worklog.js")();
const Event = require("../../utils/models/event.js")();

const { Message, Errors } = require("../../utils/utils.js");

module.exports = {
    name: "user",
    description: "Set up and manage your user profile!",
    type: ApplicationCommandType.ChatInput,
    options : [{
        name: "register",
        description: "Initialize/register your user profile",
        type: ApplicationCommandOptionType.Subcommand
    }, {
        name: "settings",
        description: "View/Modify your user settings",
        type: ApplicationCommandOptionType.Subcommand
    }, {
        name: "view",
        description: "View your private profile, which displays infos such as your worklogs. Only you can see this message",
        type: ApplicationCommandOptionType.Subcommand
    }, {
        name: "profile",
        description: "Displays your public profile, which includes current/past events and significant placements",
        type: ApplicationCommandOptionType.Subcommand
    }, {
        name: "delete",
        description: "Delete your user profile and all associated data (worklogs, etc). This action is irreversible",
        type: ApplicationCommandOptionType.Subcommand
    }],

    async run(client, interaction) {

        const subcommand = interaction.options.getSubcommand();

        let user = await User.findOne({ discordId: interaction.user.id });
        if(subcommand !== "register" && !user) return await interaction.reply({ embeds: [Message.notRegisteredEmbed], ephemeral: true });
        
        switch(subcommand) {
            case "register":
                
                if(await User.exists({ discordId: interaction.user.id })) {
                    return await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Profile Already Registered")
                                .setDescription("You have already registered your user profile.")
                                .setColor("Red")
                    ], ephemeral: true });
                }

                await interaction.showModal(
                    new ModalBuilder()
                        .setTitle("Register Your User Profile")
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
                    const user = await User.findOne({ name: fullName }).collation({ locale: 'en', strength: 1 }).populate("events");

                    if(!user) return await modalInteraction.reply({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle("Name Not Found")
                                    .setDescription(`We could not find a valid TSA member named \`${fullName}\` in our database. Please ensure you entered your name exactly as you did when signing up for TSA.\nContact @Chthollygirl if you believe that this is a mistake.`)
                                    .setColor("Red")
                            ],
                            ephemeral: true
                        })

                    if(user.verified) return await modalInteraction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Profile Already Registered")
                                .setDescription(`The TSA member profile for \`${fullName}\` has already been registered with the Discord account <@${user.discordId}>.`)
                                .setColor("Red")
                        ],
                        ephemeral: true
                    })

                    const response = await modalInteraction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Is this you?")
                                .setDescription(`We found a TSA member with the name ***${user.name}***.\n**Grade:** ${user.grade}\n**School Email:** ${user.email[0]}\n**Events:** *${user.events?.map(e => e.name).join(", ") ?? "None"}*`)
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
                                user.verified = true;

                                await confirmationInteraction.update({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle("Profile Registered")
                                            .setDescription("Your user profile has been successfully registered!\nUse `/user view` to view your profile.")
                                            .setColor("Green")
                                    ],
                                    components: []
                                });

                                //find all events with a worklog and with this user
                                (await Event.find({worklog: {$exists: true}, members: { $in: [user._id] }})).forEach(worklog => {
                                    if(!user.events) user.events = [];
                                    user.events.push(worklog._id);
                                })

                                await user.save();
                                if(!user.worklogs) return;

                                return await confirmationInteraction.followUp({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle("Worklogs Found")
                                            .setDescription("We found existing worklogs associated with your profile for the following events:\n- **" + user.events.map(n => n.name).join("**\n- **")+"**\nYou can view them using the `/worklog worklogs list` command.")
                                            .setColor("Green")
                                    ]
                                })

                            } else {
                               return await confirmationInteraction.update({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle("Registration Cancelled")
                                            .setDescription("Profile registration has been cancelled. Please ensure you enter your name exactly as you did when signing up for TSA.\nYou may run the `/user register` command again to reattempt profile registration.")
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