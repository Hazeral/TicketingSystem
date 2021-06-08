const mongoose = require('mongoose');

const moderationSchema = new mongoose.Schema(
    {
        author: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        target: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        type: {
            type: String,
            required: true,
            enum: [
                'block',
                'unblock',
                'mute',
                'unmute',
                'update_info',
                'block_ip'
            ]
        },
        reason: {
            type: String,
            max: 255,
            required: true
        },
        expires: {
            type: Date,
            default: null
        }
    },
    { timestamps: true, collection: 'moderation' }
);

module.exports = mongoose.model('Moderation', moderationSchema);
