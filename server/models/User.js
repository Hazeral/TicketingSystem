const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            max: 25,
            required: true
        },
        email: {
            type: String,
            max: 100,
            required: true
        },
        password: {
            type: String,
            required: true
        },
        groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
        muted: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Moderation',
            default: null
        },
        blocked: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Moderation',
            default: null
        }
    },
    { timestamps: true, collection: 'users' }
);

module.exports = mongoose.model('User', userSchema);
