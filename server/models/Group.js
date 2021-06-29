const mongoose = require('mongoose');
require('mongoose-long')(mongoose);
const {
    Types: { Long }
} = mongoose;

const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            max: 255,
            required: true
        },
        type: {
            type: String,
            default: 'add',
            enum: ['add', 'remove']
        },
        permissions: {
            type: Long,
            required: true
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        default: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true, collection: 'groups' }
);

module.exports = mongoose.model('Group', groupSchema);
