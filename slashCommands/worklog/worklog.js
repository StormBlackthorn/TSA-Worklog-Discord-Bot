const {  
    ApplicationCommandType,
    ApplicationCommandOptionType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    LabelBuilder,
    TextDisplayBuilder,
} = require("discord.js");
const { googleClient } = require("../../index.js");

const folderID = "1Kj7zdg_ccnVvT9F7epl5bYN1kK8GMy47";

module.exports = {
    name: "worklog",
    description: "Log your work hours and progresses!",
    type: ApplicationCommandType.ChatInput,
    options : [{
        name: "add",
        description: "Add to your worklog",
        type: ApplicationCommandOptionType.Subcommand
    }, {
        name: "init",
        description: "Initialize your worklog",
        type: ApplicationCommandOptionType.Subcommand,
    }],

    async run(client, interaction) {

        // await interaction.deferReply();

        switch(interaction.options.getSubcommand()) {
            case "init":

                await interaction.showModal(
                    new ModalBuilder()
                        .setCustomId('worklogInit')
                        .setTitle('Initialize Your Worklog')
                        .addLabelComponents(
                            new LabelBuilder()
                                .setLabel("Project Name")
                                .setDescription("The name of your project")
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("projectName")
                                        .setStyle(TextInputStyle.Short)
                                        .setPlaceholder("Your project name: ")
                                        .setRequired(true)
                                ),
                            new LabelBuilder()
                                .setLabel("Your Name")
                                .setDescription("This is only used for metadata for this project.")
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("ownerName")
                                        .setStyle(TextInputStyle.Short)
                                        .setPlaceholder("Your name: ")
                                        .setRequired(true)
                                ),
                            new LabelBuilder()
                                .setLabel("Your Email")
                                .setDescription("This is used to share the document with you. Please make sure that it is correct.")
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("ownerEmail")
                                        .setStyle(TextInputStyle.Short)
                                        .setPlaceholder("Your email: ")
                                        .setRequired(true)
                                )
                        )
                )

		

        // interaction.awaitModalSubmit({
        //     time: 60_000
        // }).then(interaction => interaction.reply('Thanks for submitting the modal!'))
        // .catch(console.error);

                // const document = await googleClient.drive.files.create({
                //     resource: {
                //         name: "Test Document",
                //         mimeType: "application/vnd.google-apps.document",
                //         parents: [folderID]
                //     },
                // });

                // await googleClient.docs.documents.batchUpdate({
                //     documentId: document.data.id,
                //     requestBody: {
                //         requests: [{
                //             insertText: {
                //                 location: { index: 1 },
                //                 text: "Test input from worklog bot",
                //             },
                //         }],
                //     },
                // });

                // // await googleClient.drive.permissions.create({
                // //     fileId: document.data.id,
                // //     requestBody: {
                // //         type: "user",
                // //         role: "writer", // or 'reader' if you just want view access
                // //         emailAddress: "",
                // //     },
                // // });

                // interaction.followUp(`Created Document: [${document.data.name}](https://docs.google.com/document/d/${document.data.id}/edit)`);

                break;
        }
    }
}