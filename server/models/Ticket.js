const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    message: {
        type: String,
        max: 500,
        required: true
    }
}, { timestamps: true});

const logSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    action: {
        type: String,
        required: true,
        enum: ['close', 'open', 'create', 'close_permanently', 'change_priority', 'change_category']
    },
    info: {
        type: String,
        max: 255,
        default: null
    }
}, { timestamps: true});

const ticketSchema = new mongoose.Schema({
    title: {
        type: String,
        max: 50,
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    messages: [messageSchema],
    priority: {
        type: String,
        default: 'medium',
        enum: ['low', 'medium', 'high']
    },
    status: {
        type: String,
        default: 'open',
        enum: ['open', 'closed', 'closed_permanently']
    },
    category: {
        type: String,
        default: 'None'
    },
    newReply: {
        fromUser: {
            type: Boolean,
            default: true
        },
        fromSupport: {
            type: Boolean,
            default: false
        }
    },
    logs: [logSchema]
}, { timestamps: true, collection : 'tickets' });

module.exports = mongoose.model('Ticket', ticketSchema);