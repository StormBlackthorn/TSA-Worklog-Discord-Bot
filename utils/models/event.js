const { Schema } = require("mongoose");


const EventSchema = new Schema({
    name:     { type: String, required: true },
    //tiebreakers, state, national
    level:    { type: String, required: true },
    //all users are initialized, so all members will be valid
    members:  {
        type: [Schema.Types.ObjectId],
        ref: "User",
        required: true,
        validate: v => Array.isArray(v) && v.length > 0
    },
    worklog:  { type: Schema.Types.ObjectId, ref: "Worklog", default: undefined },
    // the starting year(2025 for 2025-2026 school year)
    year:     { type: Number, required: true },
});

// case and accent insensitive magic thingy
EventSchema.index({ name: 1 }, { collation: { locale: 'en', strength: 1 } });

module.exports = () => {
    const { database } = require("../../index.js");
    return database.model("Event", EventSchema);
};