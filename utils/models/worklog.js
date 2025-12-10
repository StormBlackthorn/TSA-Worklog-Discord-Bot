const { Schema } = require("mongoose");

const WorklogSchema = new Schema({
    link:  { type: String, required: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    //store users and event name in event field
})

// IMPORTANT: "Worklog" is model name; Mongoose automatically makes the collection name plural (i.e., "Worklogs")
module.exports = () => {
    const { database }= require("../../index.js");
    return database.model("Worklog", WorklogSchema);
}