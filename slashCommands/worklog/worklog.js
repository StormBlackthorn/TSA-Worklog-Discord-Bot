const {  
    ApplicationCommandType,
    ApplicationCommandOptionType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ComponentType,
    EmbedBuilder,
    ContainerBuilder,
    MessageFlags,
    ButtonStyle,
    LabelBuilder,
} = require("discord.js");
const { googleClient } = require("../../index.js");

const User = require("../../utils/models/user.js")();
const Worklog = require("../../utils/models/worklog.js")();
const eventsData = require("../../utils/config/events.json");
const worklog = require("../../utils/models/worklog.js");
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
        
        if(!user) return await interaction.reply({ embeds: [Message.notRegisteredEmbed], ephemeral: true }); 

        switch(subcommand) {

            case "list": {
                
                user = await user.populate("worklogs").then((index) => index.populate({
                    path: "worklogs",
                    populate: {
                        path: "event"
                    }
                }));

                if (!user.worklogs || user.worklogs.length === 0) return interaction.reply({embeds: [
                    new EmbedBuilder()
                        .setTitle("Error")
                        .setDescription("You have no worklogs.")
                        .setColor("Red")
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
                        return await interaction.reply({ embeds: [Message.notRegisteredEmbed], ephemeral: true });
                    case "-2":
                        return await interaction.reply({ embeds: [
                            new EmbedBuilder()
                                .setTitle("No worklogs")
                                .setDescription("You have no worklogs. Set one up using `/worklog create`.")
                                .setColor("Red") 
                            ], ephemeral: true });
                    case "-3":
                        return await interaction.reply({ embeds: [
                            new EmbedBuilder()
                                .setTitle("No other worklogs")
                                .setDescription("You have no other worklogs to switch to.")
                                .setColor("Red") 
                            ], ephemeral: true });
                }



                if(!user.worklogs?.includes(worklogId)) return await interaction.reply({ embeds: [
                    new EmbedBuilder()
                        .setTitle("Invalid worklog")
                        .setDescription("The worklog you selected was invalid.")
                        .setColor("Red")
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
                                    .addOptions(
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
                                    rows: 2,
                                    columns: 5,
                                    location: { index: 1 }
                                }
                            }]
                        }
                    });

                    const docObj = await googleClient.docs.documents.get({ documentId: document.data.id });
                    const table = docObj.data.body.content.find(c => c.table)?.table;
                    
                    //TODO: make this better when I actually know how to code
                    if (table && table.tableRows && table.tableRows.length > 0) {
                        const headerRequests = [];
                        const headers = ["Date", "Team Member", "Task", "Details", "Time"];
                        const firstRow = table.tableRows[0];
                        // Iterate backwards to avoid index shifting issues
                        for (let i = 4; i >= 0; i--) {
                            if (firstRow.tableCells[i]) {
                                headerRequests.push({
                                    insertText: {
                                        text: headers[i],
                                        location: { index: firstRow.tableCells[i].startIndex + 1 } 
                                    }
                                });
                            }
                        }
                        if (headerRequests.length > 0) {
                            await googleClient.docs.documents.batchUpdate({
                                documentId: document.data.id,
                                requestBody: { requests: headerRequests }
                            });
                        }
                    }

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

                    await modalInteraction.editReply({
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
                const user = await User.findOne({ discordId: interaction.user.id }).then((index) => index.populate("activeWorklog"));
                if (!user) return await interaction.reply({ content: "You are not registered.", ephemeral: true });
                if (!user.activeWorklog) return await interaction.reply({ content: "You do not have an active worklog selected.", ephemeral: true });

                const eventName = user.activeWorklog.event.name;
                const eventGroups = eventsData[eventName];
                
                let teamMembers = [user.name]; // Default to user if not found
                if (eventGroups) {
                    for (const group of eventGroups) {
                        if (group.includes(user.name)) {
                            teamMembers = group;
                            break;
                        }
                    }
                }

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('add_member_select')
                    .setPlaceholder('Select team members')
                    .setMinValues(1)
                    .setMaxValues(teamMembers.length)
                    .addOptions(
                        teamMembers.map(member => 
                            new StringSelectMenuOptionBuilder()
                                .setLabel(member)
                                .setValue(member)
                                .setDefault(member === user.name)
                        )
                    );

                const row = new ActionRowBuilder().addComponents(selectMenu);

                const response = await interaction.reply({
                    content: 'Select team members for this entry:',
                    components: [row],
                    ephemeral: true
                });

                try {
                    const confirmation = await response.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: 60000, componentType: ComponentType.StringSelect });
                    
                    const selectedMembers = confirmation.values;

                    const modal = new ModalBuilder()
                        .setCustomId('worklog_add_modal')
                        .setTitle('Add Worklog Entry');

                    const taskInput = new TextInputBuilder()
                        .setCustomId('task')
                        .setLabel("Task")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);

                    const detailsInput = new TextInputBuilder()
                        .setCustomId('details')
                        .setLabel("Details")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true);

                    const timeInput = new TextInputBuilder()
                        .setCustomId('time')
                        .setLabel("Time (minutes)")
                        .setStyle(TextInputStyle.Short) // Number not supported in TextInput, parse later
                        .setRequired(true);

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(taskInput),
                        new ActionRowBuilder().addComponents(detailsInput),
                        new ActionRowBuilder().addComponents(timeInput)
                    );

                    await confirmation.showModal(modal);

                    const modalSubmit = await confirmation.awaitModalSubmit({ time: 300000 });
                    
                    await modalSubmit.deferReply({ ephemeral: true });

                    const task = modalSubmit.fields.getTextInputValue('task');
                    const details = modalSubmit.fields.getTextInputValue('details');
                    const time = modalSubmit.fields.getTextInputValue('time');
                    const date = new Date().toLocaleDateString("en-GB"); // DD/MM/YYYY

                    // Update Google Doc
                    const docId = user.activeWorklog.link.match(/\/d\/([a-zA-Z0-9-_]+)/)[1];
                    
                    // We need to append a row to the table.
                    // First, get the table.
                    const docObj = await googleClient.docs.documents.get({ documentId: docId });
                    const content = docObj.data.body.content;
                    let tableIndex = -1;
                    
                    // Find the first table
                    for (let i = 0; i < content.length; i++) {
                        if (content[i].table) {
                            tableIndex = i;
                            break;
                        }
                    }

                    if (tableIndex === -1) {
                        // No table found, create one? Or error?
                        // Let's assume init created it. If not, we can't easily append without creating one.
                        await modalSubmit.editReply("Could not find the worklog table in the document.");
                        return;
                    }

                    // To append a row, we can use insertTableRow at the end of the table.
                    // But insertTableRow just adds an empty row. We then need to fill it.
                    // Or we can just insert text into the last row if it's empty? No, always new row.
                    
                    // We need the index of the table start to use insertTableRow?
                    // No, insertTableRow takes a TableCellLocation or index.
                    // "The location to insert the new row. The index is 0-based relative to the start of the table."
                    
                    // Wait, the API for insertTableRow:
                    // { tableCellLocation: { tableStartLocation: { index: ... }, rowIndex: ... }, insertBelow: true }
                    
                    const tableStartLocationIndex = content[tableIndex].startIndex;
                    const lastRowIndex = content[tableIndex].table.rows - 1; // This property might not exist on the object directly like this.
                    // content[tableIndex].table.tableRows.length
                    const rowCount = content[tableIndex].table.tableRows.length;

                    const requests = [{
                        insertTableRow: {
                            tableCellLocation: {
                                tableStartLocation: { index: tableStartLocationIndex },
                                rowIndex: rowCount - 1
                            },
                            insertBelow: true
                        }
                    }];

                    await googleClient.docs.documents.batchUpdate({
                        documentId: docId,
                        requestBody: { requests }
                    });

                    // Now we need to fill the new row.
                    // We need to fetch the doc AGAIN to get the indices of the new row cells.
                    const updatedDocObj = await googleClient.docs.documents.get({ documentId: docId });
                    const updatedTable = updatedDocObj.data.body.content[tableIndex].table;
                    const newRow = updatedTable.tableRows[rowCount]; // The one we just added (index = old length)

                    const fillRequests = [];
                    const rowValues = [date, selectedMembers.join(", "), task, details, time];

                    for (let i = 0; i < 5; i++) {
                        if (newRow.tableCells[i]) {
                            fillRequests.push({
                                insertText: {
                                    text: rowValues[i],
                                    location: { index: newRow.tableCells[i].startIndex }
                                }
                            });
                        }
                    }

                    if (fillRequests.length > 0) {
                        await googleClient.docs.documents.batchUpdate({
                            documentId: docId,
                            requestBody: { requests: fillRequests }
                        });
                    }

                    await modalSubmit.editReply("Successfully added entry to worklog.");

                } catch (e) {
                    console.error(e);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.editReply({ content: 'Timed out or error occurred.', components: [] });
                    } else {
                        // interaction.followUp({ content: 'Error occurred.' });
                    }
                }

                break;
            }

            case "view":
                await interaction.reply("Worklog view command is under development.");  
                break;

            case "export":
                await interaction.reply("Worklog export command is under development.");
                break;
        
        }
    }
}