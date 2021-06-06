const { verifyToken } = require('../token');
const Moderation = require('../models/Moderation');

module.exports = async (req, res, next) => {
    const token = req.header('auth');
    if (!token) return res.status(401).json({ error: 'Unauthenticated' });

    const user = await verifyToken(token);
    if (user != null) {
        if (user.blocked != null) {
            return res.status(403).json({ error: 'Account blocked', reason: user.blocked.reason });
        }
        req.user = user;
        next();
    } else {
        return res.status(400).json({ error: 'Unauthenticated' });
    }
};