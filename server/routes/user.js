const router = require('express').Router();
const { ObjectId } = require('mongoose').mongo;
const { generateToken } = require('../token');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Moderation = require('../models/Moderation');
const BlockedIP = require('../models/BlockedIP');
const Log = require('../models/Log');
const Ticket = require('../models/Ticket');
const { flags, userHas } = require('../permissions');
const can = require('../middleware/can');
const {
    changePasswordValidation,
    changePasswordAdminValidation,
    changeDetailsValidation,
    changeGroupValidation,
    changeEmailValidation,
    addModerationValidation
} = require('../validation');

router.get('/@me', can(flags.VIEW_CURRENT_ACCOUNT_DETAILS), (req, res) => {
    return res.json({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        groups: req.user.groups.map((g) => g.name),
        createdAt: req.user.createdAt,
        muted: req.user.muted
    });
});

router.patch(
    '/@me/password',
    can(flags.CHANGE_CURRENT_ACCOUNT_PASSWORD),
    async (req, res) => {
        const { error } = changePasswordValidation(req.body);
        if (error)
            return res.status(400).json({ error: error.details[0].message });

        const user = req.user;

        const validPass = await bcrypt.compare(
            req.body.current_password,
            user.password
        );
        if (!validPass)
            return res.status(400).json({ error: 'Invalid current password' });

        if (req.body.current_password == req.body.password)
            return res
                .status(400)
                .json({ error: 'New password cannot be the same' });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(req.body.password, salt);

        try {
            await User.updateOne(
                { _id: user._id },
                { $set: { password: hash } }
            );
            req.user.password = hash;

            const moderation = new Moderation({
                author: req.user._id,
                target: user._id,
                type: 'update_info',
                reason: `Updated password`
            });
            await moderation.save();

            const token = generateToken(req.user);
            res.header('auth', token).json({ token: token });
        } catch (err) {
            res.status(500).json({ error: 'Error updating password' });
        }
    }
);

router.patch(
    '/@me/email',
    can(flags.CHANGE_CURRENT_ACCOUNT_EMAIL),
    async (req, res) => {
        const { error } = changeEmailValidation(req.body);
        if (error)
            return res.status(400).json({ error: error.details[0].message });

        const user = req.user;
        try {
            await User.updateOne(
                { _id: user._id },
                { $set: { email: req.body.email } }
            );

            const moderation = new Moderation({
                author: req.user._id,
                target: user._id,
                type: 'update_info',
                reason: `Updated email: '${user.email}' => '${req.body.email}'`
            });
            await moderation.save();

            res.json({
                _id: user._id,
                name: user.name,
                email: req.body.email,
                group: user.groups.map((g) => g.name),
                createdAt: user.createdAt,
                muted: req.user.muted,
                old: {
                    email: user.email
                }
            });
        } catch {
            res.status(500).json({ error: 'Error updating details' });
        }
    }
);

router.get(
    '/@me/tickets',
    can(flags.VIEW_CURRENT_ACCOUNT_TICKETS),
    async (req, res) => {
        const user = req.user;
        if (user) {
            try {
                const tickets = await Ticket.find({ author: user._id })
                    .select({ messages: 0 })
                    .populate('author', { name: 1, groups: 1 })
                    .populate({
                        path: 'logs',
                        populate: {
                            path: 'author',
                            select: { name: 1, groups: 1 }
                        }
                    });

                res.json(tickets);
            } catch {
                res.status(500).json({ error: 'Error listing tickets' });
            }
        } else res.status(404).json({ error: 'User not found' });
    }
);

router.get(
    '/:id/tickets',
    can(flags.VIEW_TICKETS_BY_USER),
    async (req, res) => {
        try {
            const user = await User.findById(ObjectId(req.params.id)).select({
                password: 0
            });
            if (user) {
                try {
                    const tickets = await Ticket.find({ author: user._id })
                        .select({ messages: 0 })
                        .populate('author', { name: 1, groups: 1 })
                        .populate({
                            path: 'logs',
                            populate: {
                                path: 'author',
                                select: { name: 1, groups: 1 }
                            }
                        });

                    res.json(tickets);
                } catch {
                    res.status(500).json({ error: 'Error listing tickets' });
                }
            } else res.status(404).json({ error: 'User not found' });
        } catch {
            res.status(400).json({ error: 'User not found' });
        }
    }
);

router.get('/:id', can(flags.VIEW_USER_DETAILS), async (req, res) => {
    try {
        const user = await User.findById(ObjectId(req.params.id)).select({
            password: 0
        });
        const populatedUser = await User.populate(user, [
            { path: 'muted' },
            { path: 'blocked' },
            { path: 'groups' }
        ]);

        if (user) res.json(populatedUser);
        else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.delete('/:id', can(flags.DELETE_USER), async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(
            ObjectId(req.params.id)
        ).select({ password: 0 });

        const moderation = new Moderation({
            author: req.user._id,
            target: user._id,
            type: 'update_info',
            reason: `Deleted account`
        });
        await moderation.save();

        const populatedUser = await User.populate(user, [
            { path: 'muted' },
            { path: 'blocked' },
            { path: 'groups' }
        ]);
        if (user) res.json(populatedUser);
        else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.patch(
    '/:id/password',
    can(flags.CHANGE_PASSWORD_BY_USER),
    async (req, res) => {
        const { error } = changePasswordAdminValidation(req.body);
        if (error)
            return res.status(400).json({ error: error.details[0].message });

        try {
            const user = await User.findById(ObjectId(req.params.id));
            if (user) {
                const userImmune = await userHas(user._id, flags.IMMUNITY);
                if (userImmune)
                    return res
                        .status(403)
                        .json({ error: 'You cannot edit this user' });

                const samePass = await bcrypt.compare(
                    req.body.password,
                    user.password
                );
                if (samePass)
                    return res
                        .status(400)
                        .json({ error: 'New password cannot be the same' });

                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash(req.body.password, salt);

                try {
                    await User.updateOne(
                        { _id: user._id },
                        { $set: { password: hash } }
                    );

                    const moderation = new Moderation({
                        author: req.user._id,
                        target: user._id,
                        type: 'update_info',
                        reason: `Updated password`
                    });
                    await moderation.save();

                    const filteredUser = await User.findById(user._id).select({
                        password: 0
                    });
                    const populatedUser = await User.populate(filteredUser, [
                        { path: 'muted' },
                        { path: 'blocked' },
                        { path: 'groups' }
                    ]);

                    res.json(populatedUser);
                } catch {
                    res.status(500).json({ error: 'Error updating password' });
                }
            } else res.status(404).json({ error: 'User not found' });
        } catch {
            res.status(400).json({ error: 'User not found' });
        }
    }
);

router.patch(
    '/:id/details',
    can(flags.CHANGE_DETAILS_BY_USER),
    async (req, res) => {
        const { error } = changeDetailsValidation(req.body);
        if (error)
            return res.status(400).json({ error: error.details[0].message });

        try {
            const user = await User.findById(ObjectId(req.params.id)).select({
                password: 0
            });
            if (user) {
                const userImmune = await userHas(user._id, flags.IMMUNITY);
                if (userImmune)
                    return res
                        .status(403)
                        .json({ error: 'You cannot edit this user' });

                if (user.name == req.body.name && user.email == req.body.email)
                    return res
                        .status(400)
                        .json({ error: 'Both name and email are unchanged' });

                try {
                    await User.updateOne(
                        { _id: user._id },
                        { $set: { name: req.body.name, email: req.body.email } }
                    );

                    const moderation = new Moderation({
                        author: req.user._id,
                        target: user._id,
                        type: 'update_info',
                        reason: `Updated details: '${user.name}' => '${req.body.name}', '${user.email}' => '${req.body.email}'`
                    });
                    await moderation.save();

                    user.name = req.body.name;
                    user.email = req.body.email;
                    const populatedUser = await User.populate(user, [
                        { path: 'muted' },
                        { path: 'blocked' },
                        { path: 'groups' }
                    ]);
                    res.json(populatedUser);
                } catch {
                    res.status(500).json({ error: 'Error updating details' });
                }
            } else res.status(404).json({ error: 'User not found' });
        } catch {
            res.status(400).json({ error: 'User not found' });
        }
    }
);

router.patch(
    '/:id/group',
    can(flags.CHANGE_GROUP_BY_USER),
    async (req, res) => {
        const { error } = changeGroupValidation(req.body);
        if (error)
            return res.status(400).json({ error: error.details[0].message });

        try {
            try {
                const group = await Group.findById(ObjectId(req.body.group));
                if (!group) {
                    return res
                        .status(400)
                        .json({ error: 'Group does not exist' });
                }
            } catch {
                return res.status(400).json({ error: 'Group does not exist' });
            }

            const user = await User.findById(ObjectId(req.params.id)).select({
                password: 0
            });
            if (user) {
                try {
                    const moderation = new Moderation({
                        author: req.user._id,
                        target: user._id,
                        type: 'update_info',
                        reason: `Added group: '${req.body.group}'`
                    });

                    const index = user.groups.indexOf(ObjectId(req.body.group));
                    if (index > -1) {
                        if (req.body.action == 'remove') {
                            user.groups.splice(index, 1);
                        } else {
                            res.status(400).json({
                                error: 'User already has this group'
                            });
                        }
                    } else {
                        if (req.body.action == 'add') {
                            user.groups.push(ObjectId(req.body.group));
                        } else {
                            res.status(400).json({
                                error: 'User does not have this group'
                            });
                        }
                    }

                    if (req.body.action == 'add') {
                        user.groups.push(ObjectId(req.body.group));
                    } else {
                        moderation.reason = `Removed group: '${req.body.group}'`;
                    }

                    await User.updateOne(
                        { _id: user._id },
                        { $set: { groups: user.groups } }
                    );

                    await moderation.save();

                    user.group = req.body.group;
                    const populatedUser = await User.populate(user, [
                        { path: 'muted' },
                        { path: 'blocked' },
                        { path: 'groups' }
                    ]);

                    res.json(populatedUser);
                } catch {
                    res.status(500).json({ error: 'Error updating group' });
                }
            } else res.status(404).json({ error: 'User not found' });
        } catch {
            res.status(400).json({ error: 'User not found' });
        }
    }
);

router.get(
    '/:id/moderations',
    can(flags.VIEW_MODERATIONS_BY_USER),
    async (req, res) => {
        try {
            const user = await User.findById(ObjectId(req.params.id));
            if (user) {
                try {
                    const logs = await Moderation.find({ target: user._id })
                        .populate('author', { name: 1, groups: 1 })
                        .populate('target', { name: 1, groups: 1 });

                    res.json(logs);
                } catch {
                    res.status(500).json({ error: 'Error listing moderation' });
                }
            } else res.status(404).json({ error: 'User not found' });
        } catch {
            res.status(400).json({ error: 'User not found' });
        }
    }
);

router.get(
    '/:id/moderations/authored',
    can(flags.VIEW_MODERATIONS_BY_AUTHOR),
    async (req, res) => {
        try {
            const user = await User.findById(ObjectId(req.params.id));
            if (user) {
                try {
                    const logs = await Moderation.find({ author: user._id })
                        .populate('author', { name: 1, groups: 1 })
                        .populate('target', { name: 1, groups: 1 });

                    res.json(logs);
                } catch {
                    res.status(500).json({ error: 'Error listing moderation' });
                }
            } else res.status(404).json({ error: 'User not found' });
        } catch {
            res.status(400).json({ error: 'User not found' });
        }
    }
);

router.post('/:id/block', can(flags.BLOCK_USER), async (req, res) => {
    const { error } = addModerationValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const user = await User.findById(ObjectId(req.params.id));
        if (user) {
            if (user.blocked != null)
                return res.status(400).json({ error: 'User already blocked' });
            const userImmune = await userHas(user._id, flags.IMMUNITY);
            if (userImmune)
                return res
                    .status(403)
                    .json({ error: 'You cannot block this user' });

            const moderation = new Moderation({
                author: req.user._id,
                target: user._id,
                type: 'block',
                reason: req.body.reason,
                expires: req.body.expires
            });

            try {
                const savedModeration = await moderation.save();
                const newModeration = await Moderation.populate(
                    savedModeration,
                    [
                        { path: 'author', select: { name: 1, groups: 1 } },
                        { path: 'target', select: { name: 1, groups: 1 } }
                    ]
                );

                await User.updateOne(
                    { _id: user._id },
                    { $set: { blocked: newModeration._id } }
                );

                res.json(newModeration);
            } catch (err) {
                res.status(400).json({ error: 'Could not add moderation' });
            }
        } else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.get('/:id/ips', can(flags.VIEW_IPS_BY_USER), async (req, res) => {
    try {
        const user = await User.findById(ObjectId(req.params.id)).select({
            password: 0
        });
        if (user) {
            const userImmune = await userHas(user._id, flags.IMMUNITY);
            if (userImmune)
                return res
                    .status(403)
                    .json({ error: "You cannot view this user's IPs" });

            try {
                const ips = await Log.aggregate([
                    { $match: { user: user._id } },
                    {
                        $group: {
                            _id: '$ip',
                            uses: { $sum: 1 }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            ip: '$_id',
                            uses: 1
                        }
                    }
                ]);

                res.json({
                    user: user,
                    ips: ips
                });
            } catch (err) {
                res.status(400).json({ error: 'Could not retrieve IPs' });
            }
        } else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.get('/:id/sameip', can(flags.VIEW_SAMEIP_BY_USER), async (req, res) => {
    try {
        const user = await User.findById(ObjectId(req.params.id)).select({
            password: 0
        });
        if (user) {
            const userImmune = await userHas(user._id, flags.IMMUNITY);
            if (userImmune)
                return res
                    .status(403)
                    .json({ error: "You cannot view this user's IPs" });

            try {
                const ips = await Log.find({ user: user._id }).distinct('ip');
                const users = await Log.aggregate([
                    { $match: { ip: { $in: ips } } },
                    {
                        $group: {
                            _id: '$user',
                            uses: { $sum: 1 },
                            ips: { $addToSet: '$ip' }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            user: '$_id',
                            ips: 1,
                            uses: 1
                        }
                    }
                ]);

                const populatedUsers = await User.populate(users, [
                    { path: 'user', select: { password: 0 } }
                ]);

                res.json(populatedUsers);
            } catch (err) {
                res.status(400).json({ error: 'Could not retrieve IPs' });
            }
        } else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.post('/:id/blockip', can(flags.BLOCK_IP_BY_USER), async (req, res) => {
    const { error } = addModerationValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const user = await User.findById(ObjectId(req.params.id));
        if (user) {
            const userImmune = await userHas(user._id, flags.IMMUNITY);
            if (userImmune)
                return res
                    .status(403)
                    .json({ error: 'You cannot block this user' });

            const latestIP = await Log.findOne({ user: user._id }).sort({
                created_at: -1
            });
            const blockedIP = await BlockedIP.findOne({
                ip: latestIP.ip,
                active: true
            });

            if (blockedIP)
                return res
                    .status(400)
                    .json({ error: 'User IP already blocked' });

            try {
                const sameIPUsers = await Log.find({
                    ip: latestIP.ip
                }).distinct('user');

                const moderation = new Moderation({
                    author: req.user._id,
                    target: user._id,
                    type: 'block_ip',
                    reason: req.body.reason,
                    expires: req.body.expires
                });

                await moderation.save();

                const ipblock = new BlockedIP({
                    ip: latestIP.ip,
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
                    ip: latestIP.ip,
                    users: blockedUsers
                });
            } catch (err) {
                res.status(400).json({ error: 'Could not add moderation' });
            }
        } else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.post('/:id/unblock', can(flags.UNBLOCK_USER), async (req, res) => {
    const { error } = addModerationValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const user = await User.findById(ObjectId(req.params.id)).populate(
            'blocked'
        );
        if (user) {
            if (user.blocked == null)
                return res
                    .status(400)
                    .json({ error: 'User already unblocked' });

            if (user.blocked.type == 'block_ip')
                return res.status(400).json({
                    error: 'User IP blocked, you must first unblock ip'
                });

            const moderation = new Moderation({
                author: req.user._id,
                target: user._id,
                type: 'unblock',
                reason: req.body.reason
            });

            try {
                const savedModeration = await moderation.save();
                const newModeration = await Moderation.populate(
                    savedModeration,
                    [
                        { path: 'author', select: { name: 1, groups: 1 } },
                        { path: 'target', select: { name: 1, groups: 1 } }
                    ]
                );

                await User.updateOne(
                    { _id: user._id },
                    { $set: { blocked: undefined } }
                );

                res.json(newModeration);
            } catch (err) {
                res.status(400).json({ error: 'Could not add moderation' });
            }
        } else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.post('/:id/mute', can(flags.MUTE_USER), async (req, res) => {
    const { error } = addModerationValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const user = await User.findById(ObjectId(req.params.id));
        if (user) {
            if (user.muted != null)
                return res.status(400).json({ error: 'User already muted' });
            const userImmune = await userHas(user._id, flags.IMMUNITY);
            if (userImmune)
                return res
                    .status(403)
                    .json({ error: 'You cannot mute this user' });

            const moderation = new Moderation({
                author: req.user._id,
                target: user._id,
                type: 'mute',
                reason: req.body.reason,
                expires: req.body.expires
            });

            try {
                const savedModeration = await moderation.save();
                const newModeration = await Moderation.populate(
                    savedModeration,
                    [
                        { path: 'author', select: { name: 1, groups: 1 } },
                        { path: 'target', select: { name: 1, groups: 1 } }
                    ]
                );

                await User.updateOne(
                    { _id: user._id },
                    { $set: { muted: newModeration._id } }
                );

                res.json(newModeration);
            } catch (err) {
                res.status(400).json({ error: 'Could not add moderation' });
            }
        } else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.post('/:id/unmute', can(flags.UNMUTE_USER), async (req, res) => {
    const { error } = addModerationValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const user = await User.findById(ObjectId(req.params.id));
        if (user) {
            if (user.muted == null)
                return res.status(400).json({ error: 'User already unmuted' });

            const moderation = new Moderation({
                author: req.user._id,
                target: user._id,
                type: 'unmute',
                reason: req.body.reason
            });

            try {
                const savedModeration = await moderation.save();
                const newModeration = await Moderation.populate(
                    savedModeration,
                    [
                        { path: 'author', select: { name: 1, groups: 1 } },
                        { path: 'target', select: { name: 1, groups: 1 } }
                    ]
                );

                await User.updateOne(
                    { _id: user._id },
                    { $set: { muted: undefined } }
                );

                res.json(newModeration);
            } catch (err) {
                res.status(400).json({ error: 'Could not add moderation' });
            }
        } else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

module.exports = router;
