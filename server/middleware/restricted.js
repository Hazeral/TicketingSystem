const { verifyToken } = require('../token');
const User = require('../models/User');
const Moderation = require('../models/Moderation');

module.exports = async (req, res, next) => {
    const token = req.header('auth');
    if (!token) return res.status(401).json({ error: 'Unauthenticated' });

    const user = await verifyToken(token);
    if (user != null) {
        if (user.muted != null) {
            if (user.muted.expires < new Date() && user.muted.expires != undefined) {
                const moderation = new Moderation({
                    author: user.muted.author,
                    target: user._id,
                    type: 'unmute',
                    reason: `UNMUTED BY SERVER: Passed expiry [${user.muted._id}]`
                });
        
                try {
                    await moderation.save();
                    await User.updateOne({ _id: user._id }, { $set: { muted: undefined } });
                } catch {}
            }
        }
        if (user.blocked != null) {
            if (user.blocked.expires < new Date() && user.blocked.expires != undefined) {
                const moderation = new Moderation({
                    author: user.blocked.author,
                    target: user._id,
                    type: 'unblock',
                    reason: `UNBLOCKED BY SERVER: Passed expiry [${user.blocked._id}]`
                });
        
                try {
                    await moderation.save();
                    await User.updateOne({ _id: user._id }, { $set: { blocked: undefined } });
                } catch {}
            } else {
                return res.status(403).json({ error: 'Account blocked', reason: user.blocked.reason, expires: user.blocked.expires });
            }
        }
        req.user = user;
        next();
    } else {
        return res.status(400).json({ error: 'Unauthenticated' });
    }
};