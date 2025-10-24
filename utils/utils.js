const { googleClient, database } = require("../index.js");
const fs = require("fs");

module.exports = {
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
            .text()).split("\n").slice(2);

        const events = {};
        const namesSet = new Set();

        for (const line of lines) {

            const cols = line.replace(/"/g, "")
                // The stupid event name with comma in it
                .replace("Computer-Aided Design 3D, Engineering", "Computer-Aided Design -- 3D Engineering")
                .replace("Computer-Aided Design 3D, Architecture", "Computer-Aided Design -- Architecture")
                .split(",");

            const eventName = cols[6];

            if (!events[eventName]) events[eventName] = [];

            if(!module.exports.allEvents.includes(eventName)) module.exports.allEvents.push(eventName);
            const members = cols.slice(7).map(e => e.replaceAll("\r", "")).filter(Boolean);

            members.forEach(name => namesSet.add(name));
            //add members
            events[eventName].push(members);
        }

        fs.writeFileSync("./utils/config/events.json", JSON.stringify(events));
        module.exports.allMembers.push(...Array.from(namesSet));

        
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



};

