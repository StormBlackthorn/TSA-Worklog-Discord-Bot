const { Schema } = require("mongoose");

const requiredString = {
    type: String,
    required: true,
}

const WorklogSchema = new Schema({
    link: requiredString,
    name: requiredString,
    users: {
        type: [Schema.Types.ObjectId],
        ref: "User",
        required: true,
        validate: v => Array.isArray(v) && v.length > 0
    },
})

// IMPORTANT: "Worklog" is model name; Mongoose automatically makes the collection name plural (i.e., "Worklogs")
module.exports = () => {
    const { database }= require("../../index.js");
    return database.model("Worklog", WorklogSchema);
}