const router = require('express').Router();
const User = require('../models/User');
const Log = require('../models/Log');
const Moderation = require('../models/Moderation');
const BlockedIP = require('../models/BlockedIP');
const restrictTo = require('../middleware/restrictTo');

router.get('/', async (req, res) => {
    const users = await User.find({}).select({ password: 0 });

    res.json(users);
});

router.get('/blocked', async (req, res) => {
    const users = await User.find({ blocked: { $ne: null } }).select({
        password: 0
    });

    res.json(users);
});

router.get('/muted', async (req, res) => {
    const users = await User.find({ blocked: { $ne: null } }).select({
        password: 0
    });

    res.json(users);
});

router.get('/ip/:ip', async (req, res) => {
    if (req.params.ip == '')
        return res.status(400).json({ error: 'You must provide an IP' });

    try {
        const users = await Log.aggregate([
            { $match: { ip: req.params.ip } },
            {
                $group: {
                    _id: '$user',
                    uses: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    user: '$_id',
                    uses: 1
                }
            }
        ]);

        const populatedUsers = await User.populate(users, [
            { path: 'user', select: { password: 0 } }
        ]);

        res.json(populatedUsers);
    } catch (err) {
        res.status(400).json({ error: 'Could not retrieve users' });
    }
});

router.post('/ip/:ip/block', async (req, res) => {
    if (req.params.ip == '')
        return res.status(400).json({ error: 'You must provide an IP' });

    try {
        const blockedIP = await BlockedIP.findOne({
            ip: req.params.ip,
            active: true
        });

        if (blockedIP)
            return res.status(400).json({ error: 'IP already blocked' });

        try {
            const sameIPUsers = await Log.find({
                ip: req.params.ip
            }).distinct('user');

            if (sameIPUsers.length < 1)
                return res.status(400).json({ error: 'No users use this IP' });

            const moderation = new Moderation({
                author: req.user._id,
                target: sameIPUsers[0],
                type: 'block_ip',
                reason: req.body.reason,
                expires: req.body.expires
            });

            await moderation.save();

            const ipblock = new BlockedIP({
                ip: req.params.ip,
                moderation: moderation._id
            });

            await ipblock.save();

            await User.updateMany(
                { _id: { $in: sameIPUsers } },
                { $set: { blocked: moderation._id } }
            );

            const blockedUsers = await User.find({
                _id: { $in: sameIPUsers }
            }).select({ password: 0 });

            res.json({
                ip: req.params.ip,
                users: blockedUsers
            });
        } catch (err) {
            console.log(err);
            res.status(400).json({ error: 'Could not block IP' });
        }
    } catch {
        res.status(400).json({ error: 'Could not block IP' });
    }
});

router.post('/ip/:ip/unblock', restrictTo('admin'), async (req, res) => {
    if (req.params.ip == '')
        return res.status(400).json({ error: 'You must provide an IP' });

    try {
        const blockedIP = await BlockedIP.findOne({
            ip: req.params.ip,
            active: true
        });

        if (!blockedIP)
            return res.status(400).json({ error: 'IP not blocked' });

        try {
            const sameIPUsers = await Log.find({
                ip: req.params.ip
            }).distinct('user');

            if (sameIPUsers.length < 1)
                return res.status(400).json({ error: 'No users use this IP' });

            const moderation = new Moderation({
                author: req.user._id,
                target: sameIPUsers[0],
                type: 'unblock',
                reason: req.body.reason
            });

            await moderation.save();

            await BlockedIP.findByIdAndUpdate(blockedIP._id, {
                $set: { active: false }
            });

            await User.updateMany(
                { _id: { $in: sameIPUsers } },
                { $set: { blocked: null } }
            );

            const blockedUsers = await User.find({
                _id: { $in: sameIPUsers }
            }).select({ password: 0 });

            res.json({
                ip: req.params.ip,
                users: blockedUsers
            });
        } catch (err) {
            console.log(err);
            res.status(400).json({ error: 'Could not unblock IP' });
        }
    } catch {
        res.status(400).json({ error: 'Could not unblock IP' });
    }
});

module.exports = router;
