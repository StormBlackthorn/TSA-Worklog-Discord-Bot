const { ApplicationCommandType, ApplicationCommandOptionType } = require("discord.js");
const { googleClient } = require("../../index.js");

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

        interaction.deferReply();

        switch(interaction.options.getSubcommand()) {
            case "init":
                
                const document = await googleClient.drive.files.create({
                    resource: {
                        name: "Test Document",
                        mimeType: "application/vnd.google-apps.document",
                        parents: ["1Kj7zdg_ccnVvT9F7epl5bYN1kK8GMy47"]
                    },
                });

                await googleClient.docs.documents.batchUpdate({
                    documentId: document.data.id,
                    requestBody: {
                        requests: [{
                            insertText: {
                                location: { index: 1 },
                                text: "Test input from worklog bot",
                            },
                        }],
                    },
                });

                // await googleClient.drive.permissions.create({
                //     fileId: document.data.id,
                //     requestBody: {
                //         type: "user",
                //         role: "writer", // or 'reader' if you just want view access
                //         emailAddress: "",
                //     },
                // });

                interaction.followUp(`Created Document: [${document.data.name}](https://docs.google.com/document/d/${document.data.id}/edit)`);

                break;
        }
    }
}