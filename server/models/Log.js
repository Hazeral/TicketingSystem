const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
    {
        ip: {
            type: String,
            required: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        type: {
            type: String,
            required: true,
            enum: ['auth', 'token']
        },
        uri: {
            type: String,
            required: true
        },
        user_agent: {
            type: String
        }
    },
    { timestamps: true, collection: 'logs' }
);

module.exports = mongoose.model('Log', logSchema);
