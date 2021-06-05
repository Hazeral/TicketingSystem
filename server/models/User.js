const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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
    group: {
        type: String,
        default: 'user'
    } // user, support, moderator, admin
}, { timestamps: true, collection : 'users' });

module.exports = mongoose.model('User', userSchema);