const fs = require("fs");
const { EmbedBuilder, WebhookClient } = require("discord.js");
require('dotenv').config({debug: false});

const webHook = new WebhookClient({ url: process.env.WEBHOOK_URL });

const Users = require("./models/user.js");


module.exports = {
    /**
     * Collection of utility functions related to events management
     */
    Events: {
         /**
         * List of all the events that has competitors. Events with no sign ups will not show up.
         */
        allEvents: [],
        /**
         * List of all the members that have signed up for events. No duplicates.
         */
        allMembers: [],
        /**
         * Fetch events data from the Google Sheets and store it locally
         */
        async fetchEventsData() {

            const lines = (await (await fetch("https://docs.google.com/spreadsheets/d/1TVDFLZBMgkTF0BKPGhmLP_FbUePj-CfKaJu9Avp7bPw/export?format=csv&gid=0"))
                .text()).split("\n");

            //remove header
            lines.shift();

            const events = {};
            const namesSet = new Set();

            for (const line of lines) {

                const cols = line.replace(/"/g, "")
                    // The stupid event names with comma in it
                    .replace("Computer-Aided Design 3D, Engineering", "Computer-Aided Design -- 3D Engineering")
                    .replace("Computer-Aided Design 3D, Architecture", "Computer-Aided Design -- Architecture")
                    .split(",");

                const eventName = cols[6];

                if (!events[eventName]) events[eventName] = [];

                if(!this.allEvents.includes(eventName)) this.allEvents.push(eventName);
                const members = cols.slice(7).map(e => e.replaceAll("\r", "")).filter(Boolean);

                members.forEach(name => namesSet.add(name));
                //add members
                events[eventName].push(members);
            }

            fs.writeFileSync("./utils/config/events.json", JSON.stringify(events));

            // do some goofy things because of reference issues
            this.allMembers.push(...Array.from(namesSet));

            
        },

        /**
         * Returns a list of events that a member is participating in
         * @param { String } name  The name of the member
         * @returns { Array<String> | Boolean } List of event names or false if member does not exist
         */
        getEventsFromMember(name) {
            if(!module.exports.memberExist(name)) return false;

            const returned = [];
            const events = require("./config/events.json");

            for (const event in events) {
                for (const group of events[event]) {
                    if (group.includes(name)) {
                        returned.push(event);
                        break;
                    }
                }
            }

            return returned;

        },

        /**
         * Checks if a member exists and has signed up for events. Members who registered but did not sign up for events is considered to not exist.
         * @param {String} name  The name of the member
         * @returns {Boolean} Whether the member exists
         */
        memberExist(name) {
            return module.exports.allMembers.includes(name);
        },

        /**
         * Get all events data from the local JSON file
         * @returns { Object } Events data
         */
        getEventsData() {
            return require("./config/events.json");
        },

        /**
         * Get all groups for a specific event
         * @param {String} eventName
         * @returns {Array<Array<String>>} List of member names
         */
        getEventMembersFromEvent(eventName) {
            return module.exports.getEventsData()[eventName] || [];
        },
    },

    /**
     * Collection of utility functions related to database operations
     */
    Database: {
        /**
         * Checks if a user exists in the db
         * @param {String} discordId the discord ID
         * @returns { user | Boolean }  Check if the user exists. Returns the user object if exists, else return false
         */
        userExist: async (discordId) => {
            const user = await Users.findOne({ discordId }).populate("worklogs");
            return user ?? false;
        },
    
    },

    /**
     * Sends error to webhook and log it in console, optionally replying the user with the error
     * @param { Object } error the error object 
     * @param { String } error.stack The error stack trace
     * @param { String } error.content The error content/message
     * @param { String } error.title The error title
     * @param { Interaction } error.interaction The interaction to reply to (optional)
     */
    errorMessage: async ({ stack, content="ERROR", title="ERROR", interaction }) => {
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor('Red')
            .setDescription(`***${content}***\n\n\`\`\`sh\n${stack.length > 2000 ? stack.slice(0, 2000) + '\n... [TRUNCATED, LOGGED IN CONSOLE]' : stack}\`\`\` `)
            .setTimestamp()

        await webHook.send({
            content: `<@1409557350729257090>`,
            embeds: [embed]
        })
        
        if(interaction) await interaction.reply({ embeds: [embed], ephemeral: true })

        console.warn(`----------ERROR----------\n${title}: ${content}\n\n${stack}\n-------------------------`)
    }




};

