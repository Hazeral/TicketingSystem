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
    newReplyFromSupport: {
        type: Boolean,
        default: false
    },
    newReplyFromUser: {
        type: Boolean,
        default: true
    },
    closed: {
        type: Boolean,
        default: false
    },
    closedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    reopenedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, { timestamps: true, collection : 'tickets' });

module.exports = mongoose.model('Ticket', ticketSchema);