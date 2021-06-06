const router = require('express').Router();
const { ObjectId } = require('mongoose').mongo;
const { generateToken } = require('../token');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Moderation = require('../models/Moderation');
const Ticket = require('../models/Ticket');
const restrictTo = require('../middleware/restrictTo');
const { changePasswordValidation, changePasswordAdminValidation, changeDetailsValidation, changeGroupValidation, changeEmailValidation, addModerationValidation } = require('../validation');

router.get('/@me', (req, res) => {
    return res.json({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        group: req.user.group,
        createdAt: req.user.createdAt,
        muted: req.user.muted
    });
});

router.patch('/@me/password', async (req, res) => {
    const { error } = changePasswordValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const user = req.user;

    const validPass = await bcrypt.compare(req.body.current_password, user.password);
    if (!validPass) return res.status(400).json({ error: 'Invalid current password' });

    if (req.body.current_password == req.body.password) return res.status(400).json({ error: 'New password cannot be the same' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(req.body.password, salt);

    try {
        await User.updateOne({ _id: user._id }, { $set: { password: hash } });
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
});

router.patch('/@me/email', async (req, res) => {
    const { error } = changeEmailValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const user = req.user;
    try {
        await User.updateOne({ _id: user._id }, { $set: { email: req.body.email } });

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
            group: user.group,
            createdAt: user.createdAt,
            muted: req.user.muted,
            old: {
                email: user.email
            }
        });
    } catch {
        res.status(500).json({ error: 'Error updating details' });
    }
});

router.get('/@me/tickets', async (req, res) => {
    const user = req.user;
    if (user) {
        try {
            const tickets = await Ticket.find({ author: user._id }).select({ messages: 0 })
            .populate('author', { name: 1, group: 1 })
            .populate('closedBy', { name: 1, group: 1 })
            .populate('reopenedBy', { name: 1, group: 1 });

            res.json(tickets);
        } catch {
            res.status(500).json({ error: 'Error listing tickets' });
        }
    }
    else res.status(404).json({ error: 'User not found' });
});

router.get('/:id/tickets', restrictTo('admin', 'moderator', 'support'), async (req, res) => {
    try {
        const user = await User.findById(ObjectId(req.params.id)).select({ "password": 0 });
        if (user) {
            try {
                const tickets = await Ticket.find({ author: user._id }).select({ messages: 0 })
                .populate('author', { name: 1, group: 1 })
                .populate('closedBy', { name: 1, group: 1 })
                .populate('reopenedBy', { name: 1, group: 1 });
    
                res.json(tickets);
            } catch {
                res.status(500).json({ error: 'Error listing tickets' });
            }
        }
        else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.get('/:id', restrictTo('admin', 'moderator', 'support'), async (req, res) => {
    try {
        const user = await User.findById(ObjectId(req.params.id)).select({ "password": 0 });
        const populatedUser = await User.populate(user, [{ path: 'muted' }, { path: 'blocked' }]);
        if (user) res.json(populatedUser);
        else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.delete('/:id', restrictTo('admin'), async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(ObjectId(req.params.id)).select({ password: 0 });

        const moderation = new Moderation({
            author: req.user._id,
            target: user._id,
            type: 'update_info',
            reason: `Deleted account`
        });
        await moderation.save();

        const populatedUser = await User.populate(user, [{ path: 'muted' }, { path: 'blocked' }]);
        if (user) res.json(populatedUser);
        else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.patch('/:id/password', restrictTo('admin'), async (req, res) => {
    const { error } = changePasswordAdminValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const user = await User.findById(ObjectId(req.params.id));
        if (user) {
            if (user.group == 'admin' && req.user.group == 'moderator') return res.status(403).json({ error: 'You cannot edit this user' });
    
            const samePass = await bcrypt.compare(req.body.password, user.password);
            if (samePass) return res.status(400).json({ error: 'New password cannot be the same' });
    
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(req.body.password, salt);
    
            try {
                await User.updateOne({ _id: user._id }, { $set: { password: hash } });

                const moderation = new Moderation({
                    author: req.user._id,
                    target: user._id,
                    type: 'update_info',
                    reason: `Updated password`
                });
                await moderation.save();

                const filteredUser = await User.findById(user._id).select({ password: 0 });
                const populatedUser = await User.populate(filteredUser, [{ path: 'muted' }, { path: 'blocked' }]);

                res.json(populatedUser);
            } catch {
                res.status(500).json({ error: 'Error updating password' });
            }
        }
        else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.patch('/:id/details', restrictTo('admin', 'moderator'), async (req, res) => {
    const { error } = changeDetailsValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const user = await User.findById(ObjectId(req.params.id)).select({ password: 0 });
        if (user) {
            if (user.group == 'admin' && req.user.group == 'moderator') return res.status(403).json({ error: 'You cannot edit this user' });
            
            if (user.name == req.body.name && user.email == req.body.email) return res.status(400).json({ error: 'Both name and email are unchanged' });

            try {
                await User.updateOne({ _id: user._id }, { $set: { name: req.body.name, email: req.body.email } });

                const moderation = new Moderation({
                    author: req.user._id,
                    target: user._id,
                    type: 'update_info',
                    reason: `Updated details: '${user.name}' => '${req.body.name}', '${user.email}' => '${req.body.email}'`
                });
                await moderation.save();

                user.name = req.body.name;
                user.email = req.body.email;
                const populatedUser = await User.populate(user, [{ path: 'muted' }, { path: 'blocked' }]);
                res.json(populatedUser);
            } catch {
                res.status(500).json({ error: 'Error updating details' });
            }
        }
        else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.patch('/:id/group', restrictTo('admin'), async (req, res) => {
    const { error } = changeGroupValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const user = await User.findById(ObjectId(req.params.id)).select({ password: 0 });
        if (user) {
            try {
                await User.updateOne({ _id: user._id }, { $set: { group: req.body.group } });

                const moderation = new Moderation({
                    author: req.user._id,
                    target: user._id,
                    type: 'update_info',
                    reason: `Updated group: '${user.group}' => '${req.body.group}'`
                });
                await moderation.save();

                user.group = req.body.group;
                const populatedUser = await User.populate(user, [{ path: 'muted' }, { path: 'blocked' }]);

                res.json(populatedUser);
            } catch {
                res.status(500).json({ error: 'Error updating group' });
            }
        }
        else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.get('/:id/moderations', restrictTo('admin', 'moderator'), async (req, res) => {
    try {
        const user = await User.findById(ObjectId(req.params.id));
        if (user) {
            try {
                const logs = await Moderation.find({ target: user._id }).populate('author', { name: 1, group: 1 }).populate('target', { name: 1, group: 1 });
    
                res.json(logs);
            } catch {
                res.status(500).json({ error: 'Error listing moderation' });
            }
        }
        else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.get('/:id/moderations/authored', restrictTo('admin'), async (req, res) => {
    try {
        const user = await User.findById(ObjectId(req.params.id));
        if (user) {
            try {
                const logs = await Moderation.find({ author: user._id }).populate('author', { name: 1, group: 1 }).populate('target', { name: 1, group: 1 });
    
                res.json(logs);
            } catch {
                res.status(500).json({ error: 'Error listing moderation' });
            }
        }
        else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.post('/:id/block', restrictTo('admin', 'moderator'), async (req, res) => {
    const { error } = addModerationValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const user = await User.findById(ObjectId(req.params.id));
        if (user) {
            if (user.blocked != null) return res.status(400).json({ error: "User already blocked" });

            const moderation = new Moderation({
                author: req.user._id,
                target: user._id,
                type: 'block',
                reason: req.body.reason,
                expires: req.body.expires
            });
    
            try {
                const savedModeration = await moderation.save();    
                const newModeration = await Moderation.populate(savedModeration, [{ path: 'author', select: { name: 1, group: 1 } }, { path: 'target', select: { name: 1, group: 1 } }]);
    
                await User.updateOne({ _id: user._id}, { $set: { blocked: newModeration._id } });

                res.json(newModeration);
            } catch(err) {
                res.status(400).json({ error: 'Could not add moderation' });
            }
        }
        else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.post('/:id/unblock', restrictTo('admin'), async (req, res) => {
    const { error } = addModerationValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const user = await User.findById(ObjectId(req.params.id));
        if (user) {
            if (user.blocked == null) return res.status(400).json({ error: "User already unblocked" });

            const moderation = new Moderation({
                author: req.user._id,
                target: user._id,
                type: 'unblock',
                reason: req.body.reason
            });
    
            try {
                const savedModeration = await moderation.save();
                const newModeration = await Moderation.populate(savedModeration, [{ path: 'author', select: { name: 1, group: 1 } }, { path: 'target', select: { name: 1, group: 1 } }]);
    
                await User.updateOne({ _id: user._id}, { $set: { blocked: undefined } });

                res.json(newModeration);
            } catch(err) {
                res.status(400).json({ error: 'Could not add moderation' });
            }
        }
        else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.post('/:id/mute', restrictTo('admin', 'moderator'), async (req, res) => {
    const { error } = addModerationValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const user = await User.findById(ObjectId(req.params.id));
        if (user) {
            if (user.muted != null) return res.status(400).json({ error: "User already muted" });

            const moderation = new Moderation({
                author: req.user._id,
                target: user._id,
                type: 'mute',
                reason: req.body.reason,
                expires: req.body.expires
            });
    
            try {
                const savedModeration = await moderation.save();
                const newModeration = await Moderation.populate(savedModeration, [{ path: 'author', select: { name: 1, group: 1 } }, { path: 'target', select: { name: 1, group: 1 } }]);
    
                await User.updateOne({ _id: user._id}, { $set: { muted: newModeration._id } });

                res.json(newModeration);
            } catch(err) {
                res.status(400).json({ error: 'Could not add moderation' });
            }
        }
        else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.post('/:id/unmute', restrictTo('admin'), async (req, res) => {
    const { error } = addModerationValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const user = await User.findById(ObjectId(req.params.id));
        if (user) {
            if (user.muted == null) return res.status(400).json({ error: "User already unmuted" });

            const moderation = new Moderation({
                author: req.user._id,
                target: user._id,
                type: 'unmute',
                reason: req.body.reason
            });
    
            try {
                const savedModeration = await moderation.save();
                const newModeration = await Moderation.populate(savedModeration, [{ path: 'author', select: { name: 1, group: 1 } }, { path: 'target', select: { name: 1, group: 1 } }]);
    
                await User.updateOne({ _id: user._id}, { $set: { muted: undefined } });

                res.json(newModeration);
            } catch(err) {
                res.status(400).json({ error: 'Could not add moderation' });
            }
        }
        else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

module.exports = router;