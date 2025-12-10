const { Schema } = require("mongoose");


const UserSchema = new Schema({
    name:          { type: String, required: true },
    //[0] -> school email, [1...] -> other emails
    email:         { type: [String], required: true, unique: true },
    //sparse does some magic so I can have multiple null values
    discordId:     { type: String, sparse: true, unique: true, default: undefined},
    //arrays default to [], so explicitly set to undefined if empty(so it just doesn't exist) -> it internally sets to null tho
    events:        { type: [Schema.Types.ObjectId], ref: "Event", default: undefined },
    worklogs:      { type: [Schema.Types.ObjectId], ref: 'Worklog', default: undefined},
    activeWorklog: { type: Schema.Types.ObjectId, ref: 'Worklog', default: undefined },
    verified:      { type: Boolean, default: undefined },
    grade:         { type: Number, required: true},
    /*[{
        grade: 10,
        events: [{
            name: "name",
            place: "place"
        }, {...}],
    }, {...}]*/  
    pastEvents:     { type: [Schema.Types.ObjectId], ref: "Event", default: undefined },
});

// case and accent insensitive magic thingy
UserSchema.index({ name: 1 }, { collation: { locale: 'en', strength: 1 } });

// IMPORTANT: "User" is model name; Mongoose automatically makes the collection name plural (i.e., "Users")
module.exports = () => {
    const { database } = require("../../index.js");
    return database.model("User", UserSchema);
};