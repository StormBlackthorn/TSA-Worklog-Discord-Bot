const { googleClient, database } = require("../index.js");
const fs = require("fs");

module.exports = {
    async fetchEventData() {

        const lines = (await (await fetch("https://docs.google.com/spreadsheets/d/1TVDFLZBMgkTF0BKPGhmLP_FbUePj-CfKaJu9Avp7bPw/export?format=csv&gid=0"))
            .text()).split("\n").slice(2);

        const events = {};

        for (const line of lines) {

            const cols = line.replace(/"/g, "")
                // The stupid event name with comma in it
                .replace("Computer-Aided Design 3D, Engineering", "Computer-Aided Design -- 3D Engineering")
                .replace("Computer-Aided Design 3D, Architecture", "Computer-Aided Design -- Architecture")
                .split(",");

            const eventName = cols[6];

            if (!events[eventName]) events[eventName] = [];

            //add members
            events[eventName].push(
                cols.slice(7)
                    .map(e => e.replace("\r", ""))
                    .filter(Boolean)
            );
        }

        fs.writeFileSync("./utils/config/events.json", JSON.stringify(events));

        
    },

    getEventsByName(name) {
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

    getEventMembers(eventName) {
        return require("./config/events.json")[eventName];
    }

};

