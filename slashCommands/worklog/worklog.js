const {  
    ApplicationCommandType,
    ApplicationCommandOptionType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    LabelBuilder,
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
    }, {
        name: "view",
        description: "View your worklog",
        type: ApplicationCommandOptionType.Subcommand,
        options: [{
            name: "date",
            description: "The date of the entry you want to view (DD/MM/YYYY)",
            type: ApplicationCommandOptionType.String,
            required: false,
        }, {
            name: "dateRange",
            description: "View entries within a date range (format: DD/MM/YYYY - DD/MM/YYYY). Pulls up a date range picker.",
            type: ApplicationCommandOptionType.Boolean,
            required: false,
        }, {
            name: "entry",
            description: "The specific entry number you want to view",
            type: ApplicationCommandOptionType.Integer,
            required: false,
        }, {
            name: "entryRange",
            description: "View entries within the specified entry numbers. Pulls up a range picker.",
            type: ApplicationCommandOptionType.Boolean,
            required: false,
        }, {
            //TODO: make min/max bound
            name: "lastN",
            description: "View your last N entries",
            type: ApplicationCommandOptionType.Integer,
            required: false,
        }]
    }, {
        name: "export",
        description: "Export your worklog as a PDF",
        type: ApplicationCommandOptionType.Subcommand,
    }, {
        name: "worklogs",
        description: "View all your worklogs",
        type: ApplicationCommandOptionType.SubcommandGroup,
        options: [{
            name: "list",
            description: "List all your worklogs",
            type: ApplicationCommandOptionType.Subcommand,
        }, {
            name: "switch",
            description: "Switch to a different worklog",
            type: ApplicationCommandOptionType.Subcommand,
            autocomplete: true
        }],
    }],
    async run(client, interaction) {

        // await interaction.deferReply();

        switch(interaction.options.getSubcommand()) {
            case "init":

                //TODO: try to find email from name via TSA website
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
                        )
                );

                interaction.awaitModalSubmit({
                    time: 150_000
                }).then(async interaction => {

                    interaction.deferReply();

                    const projectName = interaction.fields.getTextInputValue("projectName"),
                          ownerName   = "",
                          ownerEmail  = "";
               
                    const document = await googleClient.drive.files.create({
                        resource: {
                            name: `${projectName} - TSA Worklog`,
                            mimeType: "application/vnd.google-apps.document",
                            parents: [folderID]
                        },
                    }).catch(err => {
                        console.error("Error creating document:", err);
                        interaction.followUp("There was an error creating your worklog document. Please shoot @Chthollygirl a dm");
                    });

                    await googleClient.drive.permissions.create({
                        fileId: document.data.id,
                        requestBody: {
                            type: "user",
                            role: "writer", // or 'reader' if you just want view access
                            emailAddress: ownerEmail,
                        },
                    }).catch(err => {
                        console.error("Error sharing document:", err);
                        interaction.followUp("There was an error creating your worklog document. Please shoot @Chthollygirl a dm");
                        //TODO check if email is correct
                    });;

                    interaction.followUp(`Created Document: [${document.data.name}](https://docs.google.com/document/d/${document.data.id}/edit)`);

                })
                .catch(e => {
                    interaction.followUp("You did not submit the modal in time! Please try again.") 
                    console.log(e)
                });



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

                break;

            case "add":
                await interaction.reply("Worklog add command is under development.");

                break;

            case "view":
                await interaction.reply("Worklog view command is under development.");  

                break;

            case "export":
                await interaction.reply("Worklog export command is under development.");

                break;
            
            case "worklogs":
                switch(interaction.options.getSubcommand()) {
                    case "list":
                        await interaction.reply("Worklog list command is under development.");
                        break;
                    case "switch":
                        await interaction.reply("Worklog switch command is under development.");
                        break;
                }

                break;
        }
    }
}