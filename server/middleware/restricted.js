const { verifyToken } = require('../token');
const User = require('../models/User');
const Log = require('../models/Log');
const BlockedIP = require('../models/BlockedIP');
const Moderation = require('../models/Moderation');

module.exports = async (req, res, next) => {
    const token = req.header('auth');
    if (!token) return res.status(401).json({ error: 'Unauthenticated' });

    let user = await verifyToken(token);
    if (user != null) {
        if (user.muted != null) {
            if (
                user.muted.expires < new Date() &&
                user.muted.expires != undefined
            ) {
                const moderation = new Moderation({
                    author: user.muted.author,
                    target: user._id,
                    type: 'unmute',
                    reason: `UNMUTED BY SERVER: Passed expiry [${user.muted._id}]`
                });

                try {
                    await moderation.save();
                    await User.updateOne(
                        { _id: user._id },
                        { $set: { muted: undefined } }
                    );
                } catch {}
            }
        }

        const currentIPBlocked = await BlockedIP.findOne({
            ip: req.socket.remoteAddress,
            active: true
        });

        if (currentIPBlocked) {
            await User.findByIdAndUpdate(user._id, {
                $set: { blocked: currentIPBlocked.moderation }
            });
            user = await verifyToken(token);
        }

        if (user.blocked != null) {
            if (user.blocked.type == 'block_ip') {
                if (
                    user.blocked.expires < new Date() &&
                    user.blocked.expires != undefined
                ) {
                    try {
                        const blockedIP = await BlockedIP.findOne({
                            moderation: user.blocked._id,
                            active: true
                        });

                        try {
                            const sameIPUsers = await Log.find({
                                ip: blockedIP.ip
                            }).distinct('user');

                            let moderations = [];

                            await sameIPUsers.forEach((sip) => {
                                moderations.push(
                                    new Moderation({
                                        author: user.blocked.author,
                                        target: sip,
                                        type: 'unblock',
                                        reason: `UNBLOCKED BY SERVER: Passed expiry [${user.blocked._id}]`
                                    })
                                );
                            });

                            await Moderation.insertMany(moderations);

                            await BlockedIP.findByIdAndUpdate(blockedIP._id, {
                                $set: { active: false }
                            });

                            await User.updateMany(
                                { _id: { $in: sameIPUsers } },
                                { $set: { blocked: null } }
                            );
                        } catch (err) {}
                    } catch {}
                } else {
                    return res.status(403).json({
                        error: 'Account blocked',
                        reason: user.blocked.reason,
                        expires: user.blocked.expires
                    });
                }
            } else {
                if (
                    user.blocked.expires < new Date() &&
                    user.blocked.expires != undefined
                ) {
                    const moderation = new Moderation({
                        author: user.blocked.author,
                        target: user._id,
                        type: 'unblock',
                        reason: `UNBLOCKED BY SERVER: Passed expiry [${user.blocked._id}]`
                    });

                    try {
                        await moderation.save();
                        await User.updateOne(
                            { _id: user._id },
                            { $set: { blocked: undefined } }
                        );
                    } catch {}
                } else {
                    return res.status(403).json({
                        error: 'Account blocked',
                        reason: user.blocked.reason,
                        expires: user.blocked.expires
                    });
                }
            }
        }
        req.user = user;

        const log = new Log({
            ip: req.socket.remoteAddress,
            user: user._id,
            type: 'token',
            url: req.url,
            user_agent: req.header('User-Agent')
        });
        await log.save();

        next();
    } else {
        return res.status(400).json({ error: 'Unauthenticated' });
    }
};
