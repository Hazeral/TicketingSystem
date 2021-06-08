const router = require('express').Router();
const bcrypt = require('bcrypt');
const { generateToken } = require('../token');
const User = require('../models/User');
const Log = require('../models/Log');
const BlockedIP = require('../models/BlockedIP');
const Moderation = require('../models/Moderation');
const { registerValidation, loginValidation } = require('../validation');

router.post('/register', async (req, res) => {
    const { error } = registerValidation(req.body);
    if (error) res.status(400).json({ error: error.details[0].message });

    const found = await User.findOne({ email: req.body.email });
    if (found) return res.status(400).json({ error: 'Email is taken' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(req.body.password, salt);

    const user = new User({
        name: req.body.name,
        email: req.body.email,
        password: hash
    });

    try {
        const savedUser = await user.save();
        const token = generateToken(savedUser);

        const log = new Log({
            ip: req.socket.remoteAddress,
            user: user._id,
            type: 'auth',
            url: req.url,
            user_agent: req.header('User-Agent')
        });
        await log.save();

        res.header('auth', token).json({ token: token });
    } catch (err) {
        res.status(400).json({ error: err });
    }
});

router.post('/login', async (req, res) => {
    const { error } = loginValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const user = await User.findOne({ email: req.body.email }).populate([
        { path: 'muted' },
        { path: 'blocked' }
    ]);
    if (!user) return res.status(400).json({ error: 'Email not found' });

    const validPass = await bcrypt.compare(req.body.password, user.password);
    if (!validPass) return res.status(400).json({ error: 'Invalid password' });

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

    const token = generateToken(user);

    const log = new Log({
        ip: req.socket.remoteAddress,
        user: user._id,
        type: 'auth',
        url: req.url,
        user_agent: req.header('User-Agent')
    });
    await log.save();

    res.header('auth', token).json({ token: token });
});

// reset pass (send email)

module.exports = router;
