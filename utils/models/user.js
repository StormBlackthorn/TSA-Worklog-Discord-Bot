const { Schema } = require("mongoose");


const UserSchema = new Schema({
    name:      { type: String, required: true },
    //[0] -> school email, [1...] -> other emails
    email:     { type: [String], required: true, unique: true },
    //sparse does some magic so I can have multiple null values
    discordId: { type: String, sparse: true, unique: true },
    //arrays default to [], so explicitly set to undefined if empty(so it just doesn't exist) -> it internally sets to null tho
    events:    { type: [String], default: undefined },
    worklogs:  { type: [Schema.Types.ObjectId], ref: 'Worklog', default: undefined},
    activeWorklog: Schema.Types.ObjectId,
    signedUp:  { type: Boolean },
    grade:     { type: Number, required: true},
    /*[{
        grade: 10,
        events: [{
            name: "name",
            place: "place"
        }, {...}],
    }, {...}]*/  
    pastEvents: { type: [Object], default: undefined },
});

UserSchema.index({ name: 1 }, { collation: { locale: 'en', strength: 1 } });

// IMPORTANT: "User" is model name; Mongoose automatically makes the collection name plural (i.e., "Users")
module.exports = () => {
    const { database } = require("../../index.js");
    return database.model("User", UserSchema);
};