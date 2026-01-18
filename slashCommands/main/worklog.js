/**
 * Why split into multiple files when you can have just a singular one
 * that is like 10 million lines in a giant switch case? (Toby Fox mindset)
 */

const {  
    ApplicationCommandType,
    ApplicationCommandOptionType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    EmbedBuilder,
    ContainerBuilder,
    MessageFlags,
    ButtonStyle,
    LabelBuilder,
    AttachmentBuilder,
} = require("discord.js");
const { googleClient } = require("../../index.js");

const User = require("../../utils/models/user.js")();
const Worklog = require("../../utils/models/worklog.js")();
const { Message, Errors } = require("../../utils/utils.js");

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
        name: "create",
        description: "Create your worklog for an event",
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
            name: "date_range",
            description: "View entries within a date range (format: DD/MM/YYYY - DD/MM/YYYY). Pulls up a date range picker.",
            type: ApplicationCommandOptionType.Boolean,
            required: false,
        }, {
            name: "entry",
            description: "The specific entry number you want to view. Use [start]-[end] for an entry range.",
            type: ApplicationCommandOptionType.String,
            required: false,
        }, {
            //TODO: make min/max bound
            name: "last_nth",
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
        description: "Manage your worklogs",
        type: ApplicationCommandOptionType.SubcommandGroup,
        options: [{
            name: "list",
            description: "List all your worklogs",
            type: ApplicationCommandOptionType.Subcommand,
        }, {
            name: "switch",
            description: "Switch to a different worklog",
            type: ApplicationCommandOptionType.Subcommand,
            options: [{
                name: "worklog",
                description: "The worklog to switch to",
                type: ApplicationCommandOptionType.String,
                autocomplete: true,
                required: true
            }],
        }]

    }],

    async autoComplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);

        let user = await User.findOne({ discordId: interaction.user.id }).then((index) => index.populate("worklogs"));

        if(!user) return await interaction.respond([{
            name: "You are not registered",
            value: "-1"
        }]);


        switch (focusedOption.name) {
            case "worklog": {

                if (!user.worklogs || user.worklogs.length === 0) {

                    return await interaction.respond([{
                        name: "You have no worklogs",
                        value: "-2"
                    }]);
                }
            
                user = await user.populate({
                    path: "worklogs",
                    populate: {
                        path: "event"
                    }
                });

                const filtered = user.worklogs.filter(worklog => 
                    worklog.event.name.toLowerCase().includes(focusedOption.value.toLowerCase())
                    && worklog._id.toString() !== user.activeWorklog?.toString()
                );

                if (filtered.length === 0) return await interaction.respond([{
                        name: "No other worklogs to switch to",
                        value: "-3"
                    }]);
                

                await interaction.respond(
                    filtered.map(worklog => ({ name: worklog.event.name, value: worklog._id.toString() }))
                );
            }
        }

 
    },
    
    async run(client, interaction) {

        const subcommand = interaction.options.getSubcommand();
        // mutable so that it could be populated later
        let user = await User.findOne({ discordId: interaction.user.id });
        
        if(!user) return await interaction.reply({ embeds: [Message.notRegisteredEmbed(client, interaction)], ephemeral: true }); 

        switch(subcommand) {

            case "list": {
                
                user = await user.populate("worklogs").then((index) => index.populate({
                    path: "worklogs",
                    populate: { path: "event" }
                }));

                if (!user.worklogs || user.worklogs.length === 0) return interaction.reply({embeds: [
                    new EmbedBuilder()
                        .setTitle("Error")
                        .setDescription("You have no worklogs.")
                        .setColor("Red")
                        .setAuthor({
                            name: client.user.username,
                            iconURL: client.user.displayAvatarURL(),
                            url: "https://github.com/StormBlackthorn/TSA-Worklog-Discord-Bot"
                        })
                        .setFooter({
                            text: interaction.user.username,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp()
                ], ephemeral: true });
                

                const container = new ContainerBuilder()
                    .setAccentColor(0x0099ff)
                    .addTextDisplayComponents(t => t.setContent(`## Your worklogs:`))
                    .addSeparatorComponents(s => s);
                
                //for some reason forEach doesn't work
                //"for each loop does not wait for async"
                for (let worklog of user.worklogs) {

                    const teammates = (await worklog.event.populate("members")).members.map(m => m.name).filter(name => name !== user.name).join(", ") || "Solo";

                    container.addSectionComponents(section => section
                        .addTextDisplayComponents(
                            t => t.setContent(`### **${worklog.event.name}**`),
                            t => t.setContent(`> **Teammates:** *${teammates}*`)
                        )
                        .setButtonAccessory((button) => button.setLabel("Link").setStyle(ButtonStyle.Link).setURL(worklog.link)),
                    );

                    container.addSeparatorComponents(s => s.setDivider(true))

                }
                

                return await interaction.reply({
                    components: [container],
                    flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                });

                break;

            }

            case "switch": {
                const worklogId = interaction.options.getString("worklog");

                switch(worklogId) {
                    case "-1":
                        return await interaction.reply({ embeds: [Message.notRegisteredEmbed(client, interaction)], ephemeral: true });
                    case "-2":
                        return await interaction.reply({ embeds: [
                            new EmbedBuilder()
                                .setTitle("No worklogs")
                                .setDescription("You have no worklogs. Set one up using `/worklog create`.")
                                .setColor("Red") 
                                .setAuthor({
                                    name: client.user.username,
                                    iconURL: client.user.displayAvatarURL(),
                                    url: "https://github.com/StormBlackthorn/TSA-Worklog-Discord-Bot"
                                })
                                .setFooter({
                                    text: interaction.user.username,
                                    iconURL: interaction.user.displayAvatarURL()
                                })
                                .setTimestamp()
                            ], ephemeral: true });
                    case "-3":
                        return await interaction.reply({ embeds: [
                            new EmbedBuilder()
                                .setTitle("No other worklogs")
                                .setDescription("You have no other worklogs to switch to.")
                                .setColor("Red") 
                                .setAuthor({
                                    name: client.user.username,
                                    iconURL: client.user.displayAvatarURL(),
                                    url: "https://github.com/StormBlackthorn/TSA-Worklog-Discord-Bot"
                                })
                                .setFooter({
                                    text: interaction.user.username,
                                    iconURL: interaction.user.displayAvatarURL()
                                })
                                .setTimestamp()
                            ], ephemeral: true });
                }



                if(!user.worklogs?.includes(worklogId)) return await interaction.reply({ embeds: [
                    new EmbedBuilder()
                        .setTitle("Invalid worklog")
                        .setDescription("The worklog you selected was invalid.")
                        .setColor("Red")
                        .setAuthor({
                            name: client.user.username,
                            iconURL: client.user.displayAvatarURL(),
                            url: "https://github.com/StormBlackthorn/TSA-Worklog-Discord-Bot"
                        })
                        .setFooter({
                            text: interaction.user.username,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp()
                    ], ephemeral: true });
                
                user.activeWorklog = worklogId;
                await user.save();

                const worklog = await Worklog.findById(worklogId).then((index) => index.populate("event"));

                return await interaction.reply({ components: [
                    new ContainerBuilder()
                        .setAccentColor(0x0099ff)
                        .addTextDisplayComponents(t => t.setContent(`## Active Worklog Switched:`))
                        .addSeparatorComponents(s => s)
                        .addSectionComponents(section => section
                            .addTextDisplayComponents(
                                t => t.setContent(`Successfully switched to the worklog for the event **${worklog.event.name}**`),
                            )
                            .setButtonAccessory((button) => button.setLabel("Worklog Link").setStyle(ButtonStyle.Link).setURL(worklog.link)),
                        )   

                    ], flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] });

                break;

            }
            
            case "create": {

                user = await user.populate("events").then((index) => index.populate({
                    path: "events",
                    populate: {
                        path: "members"
                    }
                })).then((index) => index.populate("worklogs"));

                //I dont even know what I'm writing anymore man
                const availableEvents = (user.events?.filter(event => !user.worklogs?.some(worklog => worklog.event._id.toString() === event._id.toString()))) || [];

                if (availableEvents.length === 0) return await interaction.reply({ 
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("No Available Events")
                            .setDescription("You have no available events to create a worklog for. Either you have worklogs for all your events or you are not part of any events.")
                            .setColor("Red")
                            .setAuthor({
                                name: client.user.username,
                                iconURL: client.user.displayAvatarURL(),
                                url: "https://github.com/StormBlackthorn/TSA-Worklog-Discord-Bot"
                            })
                            .setFooter({
                                text: interaction.user.username,
                                iconURL: interaction.user.displayAvatarURL()
                            })
                            .setTimestamp()
                    ], ephemeral: true });
                
                await interaction.showModal(
                    new ModalBuilder()
                        .setCustomId('createWorklogModal')
                        .setTitle('Create a New Worklog')
                        .addLabelComponents(
                            new LabelBuilder()
                                .setLabel("Event")
                                .setDescription("Select the event you want to create a worklog for.")
                                .setStringSelectMenuComponent(
                                    new StringSelectMenuBuilder()
                                    .setCustomId('eventSelection')
                                    .setPlaceholder('Select an event')
                                    .setOptions(
                                        availableEvents.map(event => 
                                            new StringSelectMenuOptionBuilder()
                                                .setLabel(event.name)
                                                .setValue(event.name)
                                        )
                                    )
                                )
                        )
                )

                interaction.awaitModalSubmit({
                    time: 120_000,
                }).then(async modalInteraction => {
                    const eventName = modalInteraction.fields.getStringSelectValues("eventSelection")[0];

                    const container = new ContainerBuilder()
                        .setAccentColor(0x90ee90)
                        .addTextDisplayComponents(t => t.setContent(`## Creating Worklog for **${eventName}**...`))
                        .addSeparatorComponents(s => s.setDivider(false))
                        .addTextDisplayComponents(t => t.setContent("*Please wait while we create your worklog...*"))

                    const response = await modalInteraction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2], withResponse: true });

                    const document = await googleClient.drive.files.create({
                        resource: {
                            name: `${eventName} - TSA Worklog`,
                            mimeType: "application/vnd.google-apps.document",
                            parents: [folderID]
                        },
                    }).catch(error => 
                        Errors.errorMessage({
                            stack:  error.stack,
                            content: error.message,
                            title: "Error creating Google Doc",
                            interaction: response,
                            followUp: true
                        })
                    );      
                    
                    // Initialize Table
                    await googleClient.docs.documents.batchUpdate({
                        documentId: document.data.id,
                        requestBody: {
                            requests: [{
                                insertTable: {
                                    rows: 1,
                                    columns: 5,
                                    location: { index: 1 }
                                }
                            }]
                        }
                    });

                    const docObj = await googleClient.docs.documents.get({ documentId: document.data.id });
                    const table = docObj.data.body.content.find(c => c.table).table;
                    
                    const headerRequests = [];
                    const headers = ["Date", "Team Member", "Task", "Details", "Time"];
                    // Iterate backwards to avoid index shifting issues
                    for (let i = 4; i >= 0; i--) {
                        headerRequests.push({
                            insertText: {
                                text: headers[i],
                                location: { index: table.tableRows[0].tableCells[i].startIndex + 1 } 
                            }
                        });    
                    }
                    
                    await googleClient.docs.documents.batchUpdate({
                        documentId: document.data.id,
                        requestBody: { requests: headerRequests }
                    });
                        
                    const currentEvent = user.events.find(e => e.name === eventName);
                    
                    const newWorklog = new Worklog({
                        link: `https://docs.google.com/document/d/${document.data.id}/edit`,
                        event: currentEvent._id,
                    });
                    await newWorklog.save();

                    let teammates = {};
                    currentEvent.members.forEach(member => teammates[member.name] = member.email);

                    let logContent = "";
                    async function updateMessageContent(content, clear=false) {

                        if(clear) logContent = content;
                        else logContent += content;

                        const componentText = new ContainerBuilder(
                            response.resource.message.components[0].toJSON()
                        );

                        componentText.components[2].setContent(logContent);

                        return await modalInteraction.editReply({
                            components: [ componentText ]
                        });
                    }

                    await updateMessageContent("*Sharing document with teammates...*", true);

                    await Promise.all(
 
                        [...new Set([...user.email, ...Object.values(teammates).flat()])].filter(email => email).map(email => {
                            return googleClient.drive.permissions.create({
                                fileId: document.data.id,
                                requestBody: {
                                    type: "user",
                                    role: "writer",
                                    emailAddress: email,
                                },
                            }).then(async () => {
                                let member = currentEvent.members.find(m => m.email.includes(email));
                                if(!member.worklogs) member.worklogs = [];

                                member.worklogs.push(newWorklog._id);
                                //setting self's active worklog 
                                if(member._id.toString() === user._id.toString()) member.activeWorklog = newWorklog._id;

                                return await member.save();
                            }).then(async () => 
                                updateMessageContent(`\n> Shared with **${email}** [${user.email.includes(email) ? "You" : Object.keys(teammates).find(key => teammates[key].includes(email))}]`)
                            ).catch(async error => {
                                if(error.message.includes("The specified emailAddress is invalid")) await modalInteraction.followUp({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle("Invalid Email Address")
                                            .setDescription(`The email address **${email}** is invalid. Please update your email in the system or contact an administrator.`)
                                            .setColor("Red")
                                            .setAuthor({
                                                name: client.user.username,
                                                iconURL: client.user.displayAvatarURL(),
                                                url: "https://github.com/StormBlackthorn/TSA-Worklog-Discord-Bot"
                                            })
                                            .setFooter({
                                                text: interaction.user.username,
                                                iconURL: interaction.user.displayAvatarURL()
                                            })
                                            .setTimestamp()
                                    ], ephemeral: true})
                                else Errors.errorMessage({
                                    stack:  error.stack,
                                    content: error.message,
                                    title: `Error sharing Google Doc to ${email}`,
                                    interaction: modalInteraction,
                                    followUp: true
                                })
                            })
                        })
                    )

                    return await modalInteraction.editReply({
                        embeds: [],
                        components: [
                            new ContainerBuilder()
                                .setAccentColor(0x90ee90)
                                .addTextDisplayComponents(t => t.setContent(`## Worklog for **${eventName}** Created`))
                                .addSeparatorComponents(s => s.setDivider(false))
                                .addSectionComponents(section => section
                                    .addTextDisplayComponents(t => t.setContent("*Your active worklog has been switched automatically to this new worklog.*"))
                                    .setButtonAccessory(button => button.setLabel("Worklog Link").setStyle(ButtonStyle.Link).setURL(newWorklog.link))
                                )
                                .addTextDisplayComponents(t => t.setContent(logContent.replaceAll("*Sharing document with teammates...*", "*Worklog document shared with the following emails:*")))
                        ],
                        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                    });

                 }).catch(async err => Errors.timeOut(interaction, err));

                break;
            }

            case "add": {
                await user.populate({
                    path: "activeWorklog",
                    populate: {
                        path: "event",
                        populate: { path: "members" }
                    }
                });
                
                const worklog = user.activeWorklog;

                if(!worklog) return await interaction.reply({ embeds: [
                    new EmbedBuilder()
                        .setTitle("No Active Worklog")
                        .setDescription("You have no active worklog. Please create one using `/worklog create` or switch to an existing one using `/worklog worklogs switch`.")
                        .setColor("Red")
                        .setAuthor({
                            name: client.user.username,
                            iconURL: client.user.displayAvatarURL(),
                            url: "https://github.com/StormBlackthorn/TSA-Worklog-Discord-Bot"
                        })
                        .setFooter({
                            text: interaction.user.username,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp()
                ], ephemeral: true });

                await interaction.showModal(
                    new ModalBuilder()
                        .setCustomId('addWorklogEntryModal')
                        .setTitle(`Add Worklog Entry for ${worklog.name}`)
                        .addLabelComponents(
                            new LabelBuilder()
                                .setLabel("Date")
                                .setDescription("The date of the work (MM/DD/YYYY)")
                                .setTextInputComponent( 
                                    new TextInputBuilder()
                                        .setCustomId('dateInput')
                                        //current date in MM/DD/YYYY
                                        .setValue(new Date().toLocaleDateString('en-US'))
                                        .setStyle(TextInputStyle.Short)
                                        .setRequired(true)
                                ),
                            new LabelBuilder()
                                .setLabel("Members")
                                .setDescription("The members that worked on this task")
                                .setStringSelectMenuComponent(
                                    new StringSelectMenuBuilder()
                                        .setCustomId('membersSelection')
                                        .setPlaceholder('Select team members')
                                        .setRequired(true)
                                        .setMinValues(1)
                                        .setMaxValues(worklog.event.members.length)
                                        .setOptions(
                                            worklog.event.members.map(member => 
                                                new StringSelectMenuOptionBuilder()
                                                    .setLabel(member.name)
                                                    .setValue(member.name)
                                                    .setDefault(member._id.toString() === user._id.toString())
                                            )
                                        )
                                ),
                            new LabelBuilder()
                                .setLabel("Task")
                                .setDescription("The task that was worked on")
                                .setTextInputComponent( 
                                    new TextInputBuilder()
                                        .setCustomId('taskInput')
                                        .setPlaceholder("...I finished the pizza...")
                                        .setStyle(TextInputStyle.Short)
                                        .setRequired(true)
                                ),
                            new LabelBuilder()
                                .setLabel("Details")
                                .setDescription("Details about the work done")
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId('detailsInput')
                                        .setPlaceholder("...It was a cheese pizza, very delicious indeed...")
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setRequired(true)
                                ),
                            new LabelBuilder()
                                .setLabel("Time")
                                .setDescription("Time spent on the task (in hours)")
                                .setTextInputComponent( 
                                    new TextInputBuilder()
                                        .setCustomId('timeInput')
                                        .setPlaceholder("67")
                                        .setStyle(TextInputStyle.Short)
                                        .setRequired(true)
                                )
                        )
                )

                interaction.awaitModalSubmit({
                    time: 240_000,
                }).then(async modalInteraction => {
                    const date    = modalInteraction.fields.getTextInputValue("dateInput"),
                          members = modalInteraction.fields.getStringSelectValues("membersSelection"),
                          task    = modalInteraction.fields.getTextInputValue("taskInput"),
                          details = modalInteraction.fields.getTextInputValue("detailsInput"),
                          time    = modalInteraction.fields.getTextInputValue("timeInput");

                    if(isNaN(Date.parse(date))) return await modalInteraction.reply({ embeds: [
                        new EmbedBuilder()
                            .setTitle("Invalid Date")
                            .setDescription("The date you entered is invalid. Please use the format MM/DD/YYYY.")
                            .setColor("Red")
                            .setAuthor({
                                name: client.user.username,
                                iconURL: client.user.displayAvatarURL(),
                                url: "https://github.com/StormBlackthorn/TSA-Worklog-Discord-Bot"
                            })
                            .setFooter({
                                text: interaction.user.username,
                                iconURL: interaction.user.displayAvatarURL()
                            })
                            .setTimestamp()
                    ], ephemeral: true });

                    if(isNaN(parseFloat(time)) || parseFloat(time) <= 0) return await modalInteraction.reply({ embeds: [
                        new EmbedBuilder()
                            .setTitle("Invalid Time")
                            .setDescription("The time you entered is invalid. Please enter a positive number.")
                            .setColor("Red")
                            .setAuthor({
                                name: client.user.username,
                                iconURL: client.user.displayAvatarURL(),
                                url: "https://github.com/StormBlackthorn/TSA-Worklog-Discord-Bot"
                            })
                            .setFooter({
                                text: interaction.user.username,
                                iconURL: interaction.user.displayAvatarURL()
                            })
                            .setTimestamp()
                    ], ephemeral: true });

                    const documentId   = worklog.link.split("/d/")[1].split("/")[0],
                          tableElement = await googleClient.docs.documents.get({ documentId }).then(doc => doc.data.body.content.find(c => c.table)),
                          table        = tableElement.table;

                    let targetRow = null;

                    // Start from the last row and go up
                    for (let i = table.tableRows.length - 1; i >= 0; i--) {
                        const row = table.tableRows[i];
                        
                        if (row.tableCells[0].content[0].paragraph.elements[0].textRun.content === "\n") targetRow = row;
                        else break; 
                        
                    }

                    if (!targetRow) {
                        await googleClient.docs.documents.batchUpdate({
                            documentId,
                            requestBody: { requests: [{
                                insertTableRow: {
                                    tableCellLocation: {
                                        tableStartLocation: { index: tableElement.startIndex },
                                        rowIndex: table.tableRows.length - 1
                                    },
                                    insertBelow: true
                                }
                            }]}
                        });
                        
                        // Re-fetch to get new indices safely
                        const updatedTable = await googleClient.docs.documents.get({ documentId }).then(doc => doc.data.body.content.find(c => c.table).table);
                        targetRow = updatedTable.tableRows[updatedTable.tableRows.length - 1];
                    }

                    const requests = [];
                    const values = [date, members.join(", "), task, details, time + " hrs"];
                    
                    for (let i = 4; i >= 0; i--) {
                        requests.push({
                            insertText: {
                                text: values[i],
                                location: { index: targetRow.tableCells[i].startIndex + 1 } 
                            }
                        });    
                    }

                    await googleClient.docs.documents.batchUpdate({
                        documentId,
                        requestBody: { requests }
                    });

                    return await modalInteraction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Worklog Entry Added")
                                .setDescription(`Your worklog entry for **${worklog.event.name}** has been added successfully.`)
                                .setColor("Green")
                                .addFields(
                                    { name: "Date", value: date, inline: true },
                                    { name: "Members", value: members.join(", "), inline: true },
                                    { name: "Time", value: time + " hrs", inline: true },
                                    { name: "Task", value: task, inline: true },
                                    { name: "Details", value: details, inline: true },
                                )
                                .setAuthor({
                                    name: client.user.username,
                                    iconURL: client.user.displayAvatarURL(),
                                    url: "https://github.com/StormBlackthorn/TSA-Worklog-Discord-Bot"
                                })
                                .setFooter({
                                    text: interaction.user.username,
                                    iconURL: interaction.user.displayAvatarURL()
                                })
                                .setTimestamp()
                        ],
                        ephemeral: true
                    })

                }).catch(async err => Errors.timeOut(interaction, err));

                break;
            }

            case "view":
                await interaction.reply("Worklog view command is under development.");  
                break;

            case "export": {
                await user.populate({
                    path: "activeWorklog",
                    populate: { path: "event" }
                });
                
                const worklog = user.activeWorklog;

                if(!worklog) return await interaction.reply({ embeds: [
                    new EmbedBuilder()
                        .setTitle("No Active Worklog")
                        .setDescription("You have no active worklog. Please create one using `/worklog create` or switch to an existing one using `/worklog worklogs switch`.")
                        .setColor("Red")
                        .setAuthor({
                            name: client.user.username,
                            iconURL: client.user.displayAvatarURL(),
                            url: "https://github.com/StormBlackthorn/TSA-Worklog-Discord-Bot"
                        })
                        .setFooter({
                            text: interaction.user.username,
                            iconURL: interaction.user.displayAvatarURL()
                        })
                        .setTimestamp()
                ], ephemeral: true });

                const documentId = worklog.link.split("/d/")[1].split("/")[0];

                await interaction.deferReply({ ephemeral: true });

                const response = await googleClient.drive.files.export({
                    fileId: documentId,
                    mimeType: "application/pdf"
                }, { responseType: "stream" }).catch(error => Errors.errorMessage({
                    stack:  error.stack,
                    content: error.message,
                    title: "Error exporting worklog",
                    interaction: interaction,
                    followUp: true
                }));

                const fileName = `TSA ${worklog.event.name} Worklog.pdf`.replaceAll(" ", "_"),
                      file     = new AttachmentBuilder(response.data, { name: fileName });

                const container = new ContainerBuilder()
                    .setAccentColor(0x90ee90)
                    .addTextDisplayComponents(t => t.setContent(`## Worklog Export`))
                    .addSeparatorComponents(s => s)
                    .addTextDisplayComponents(t => t.setContent(`Here is the PDF export of your worklog for **${worklog.event.name}**.`))
                    .addFileComponents(f => f.setURL(`attachment://${fileName}`));

                return await interaction.editReply({
                    components: [container],
                    files: [file],
                    flags: [MessageFlags.IsComponentsV2]
                });
                    
                break;
            }
        
        }
    }
}