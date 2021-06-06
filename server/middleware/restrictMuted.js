const Moderation = require('../models/Moderation');

module.exports = async (req, res, next) => {
    if (req.user.muted != null) {
        return res.status(403).json({ error: 'Account muted', reason: req.user.muted.reason });
    } else {
        next();
    }
};