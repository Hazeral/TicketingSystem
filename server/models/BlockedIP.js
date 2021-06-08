const mongoose = require('mongoose');

const blockedIPSchema = new mongoose.Schema(
    {
        ip: {
            type: String,
            required: true
        },
        moderation: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Moderation'
        },
        active: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true, collection: 'blocked_ips' }
);

module.exports = mongoose.model('BlockedIP', blockedIPSchema);
