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
} = require("discord.js");
const { googleClient } = require("../../index.js");

const User = require("../../utils/models/user.js")();
const Worklog = require("../../utils/models/worklog.js")();
const eventsData = require("../../utils/config/events.json");
const worklog = require("../../utils/models/worklog.js");
const { Message } = require("../../utils/utils.js");

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

        let user = await (await User.findOne({ discordId: interaction.user.id })).populate("worklogs");

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
                );

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
                
                user = await user.populate("worklogs");
                user = await user.populate({
                    path: "worklogs",
                    populate: {
                        path: "event"
                    }
                });

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

                if(worklogId === "-1") return await interaction.reply({ embeds: [Message.notRegisteredEmbed], ephemeral: true });
                if(worklogId === "-2") return await interaction.reply({ embeds: [
                    new EmbedBuilder()
                        .setTitle("No worklogs")
                        .setDescription("You have no worklogs. Set one up using `/worklog init`.")
                        .setColor("Red") 
                ], ephemeral: true });

                if(!user.worklogs?.includes(worklogId)) return await interaction.reply({ embeds: [
                    new EmbedBuilder()
                        .setTitle("Invalid worklog")
                        .setDescription("The worklog you selected was invalid.")
                        .setColor("Red")
                ], ephemeral: true });
                
                user.activeWorklog = worklogId;
                await user.save();

                const worklog = await (await Worklog.findById(worklogId)).populate("event");

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
            
            case "init": {

                user = await (await user.populate("events")).populate("worklogs");

                const userEvents = user.events || [];
                const existingWorklogNames = (user.worklogs || []).map(w => w.name);
                const availableEvents = userEvents.filter(e => !existingWorklogNames.includes(e));

                if (availableEvents.length === 0) {
                    return await interaction.reply({ content: "You have no events available to initialize a worklog for.", ephemeral: true });
                }

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('init_event_select')
                    .setPlaceholder('Select an event')
                    .addOptions(
                        availableEvents.map(event => 
                            new StringSelectMenuOptionBuilder()
                                .setLabel(event.name)
                                .setValue(event.name)
                        )
                    );

                const row = new ActionRowBuilder().addComponents(selectMenu);

                const response = await interaction.reply({
                    content: 'Select the event you want to initialize a worklog for:',
                    components: [row],
                    ephemeral: true
                });

                try {
                    const confirmation = await response.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: 60000, componentType: ComponentType.StringSelect });

                    const projectName = confirmation.values[0];
                    await confirmation.deferUpdate();
                    await interaction.editReply({ content: `Initializing worklog for **${projectName}**...`, components: [] });

                    const ownerEmail = user.email[0]; 

                    const document = await googleClient.drive.files.create({
                        resource: {
                            name: `${projectName} - TSA Worklog`,
                            mimeType: "application/vnd.google-apps.document",
                            parents: [folderID]
                        },
                    }).catch(err => {
                        console.error("Error creating document:", err);
                        interaction.editReply("There was an error creating your worklog document. Please shoot @Chthollygirl a dm");
                        return null;
                    });

                    if (!document) return;

                    await googleClient.drive.permissions.create({
                        fileId: document.data.id,
                        requestBody: {
                            type: "user",
                            role: "writer",
                            emailAddress: ownerEmail,
                        },
                    }).catch(err => {
                        console.error("Error sharing document:", err);
                    });


                    const newWorklog = new Worklog({
                        link: `https://docs.google.com/document/d/${document.data.id}/edit`,
                        event: user.events.find(e => e.name === projectName)._id,
                    });
                    await newWorklog.save();

                    user.worklogs = user.worklogs || [];
                    user.worklogs.push(newWorklog._id);
                    user.activeWorklog = newWorklog._id;
                    await user.save();

                    // Initialize Table
                    const requests = [{
                        insertTable: {
                            rows: 2,
                            columns: 5,
                            location: { index: 1 }
                        }
                    }];
                    
                    await googleClient.docs.documents.batchUpdate({
                        documentId: document.data.id,
                        requestBody: { requests }
                    });

                    // Populate Headers
                    const docObj = await googleClient.docs.documents.get({ documentId: document.data.id });
                    const table = docObj.data.body.content[1].table;
                    
                    if (table && table.tableRows && table.tableRows.length > 0) {
                        const headerRequests = [];
                        const headers = ["Date", "Team Member", "Task", "Details", "Time"];
                        const firstRow = table.tableRows[0];
                        for (let i = 0; i < 5; i++) {
                            if (firstRow.tableCells[i]) {
                                headerRequests.push({
                                    insertText: {
                                        text: headers[i],
                                        location: { index: firstRow.tableCells[i].startIndex } 
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

                    await interaction.editReply({ content: `Created Worklog for **${projectName}**: [Link](${newWorklog.link})` });

                } catch (e) {
                    console.error(e);
                    await interaction.editReply({ content: 'Selection timed out or an error occurred.', components: [] });
                }
                break;
            }

            case "add": {
                const user = await (await User.findOne({ discordId: interaction.user.id })).populate("activeWorklog");
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