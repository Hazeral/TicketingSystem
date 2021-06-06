const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    content: {
        type: String,
        max: 255,
        required: true
    },
    reference: {
        target: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        type: {
            type: String,
            required: true,
            enum: ['User', 'Ticket']
        }
    }
}, { timestamps: true, collection : 'notes' });

module.exports = mongoose.model('Note', noteSchema);