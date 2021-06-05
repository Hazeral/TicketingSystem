const router = require('express').Router();
const { ObjectId } = require('mongoose').mongo;
const { generateToken } = require('../token');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const restrictTo = require('../middleware/restrictTo');
const { changePasswordValidation, changePasswordAdminValidation, changeDetailsValidation, changeGroupValidation, changeEmailValidation } = require('../validation');

router.get('/@me', (req, res) => {
    return res.json({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        group: req.user.group,
        createdAt: req.user.createdAt
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
        res.json({
            _id: user._id,
            name: user.name,
            email: req.body.email,
            group: user.group,
            createdAt: user.createdAt,
            old: {
                email: user.email
            }
        });
    } catch {
        res.status(500).json({ error: 'Error updating details' });
    }
});

router.get('/:id', restrictTo('admin', 'moderator', 'support'), async (req, res) => {
    try {
        const user = await User.findById(ObjectId(req.params.id)).select({ "_id": 1, "name": 1, "email": 1, "group": 1, "createdAt": 1});
        if (user) res.json(user);
        else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.delete('/:id', restrictTo('admin'), async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(ObjectId(req.params.id));
        if (user) res.json(user);
        else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.patch('/:id/password', restrictTo('admin', 'moderator'), async (req, res) => {
    const { error } = changePasswordAdminValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const user = await User.findById(ObjectId(req.params.id));
    if (user) {
        if (user.group == 'admin' && req.user.group == 'moderator') return res.status(403).json({ error: 'You cannot edit this user' });

        const samePass = await bcrypt.compare(req.body.password, user.password);
        if (samePass) return res.status(400).json({ error: 'New password cannot be the same' });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(req.body.password, salt);

        try {
            await User.updateOne({ _id: user._id }, { $set: { password: hash } });
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                group: user.group,
                createdAt: user.createdAt
            });
        } catch {
            res.status(500).json({ error: 'Error updating password' });
        }
    }
    else res.status(404).json({ error: 'User not found' });
});

router.patch('/:id/details', restrictTo('admin', 'moderator'), async (req, res) => {
    const { error } = changeDetailsValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const user = await User.findById(ObjectId(req.params.id));
    if (user) {
        if (user.group == 'admin' && req.user.group == 'moderator') return res.status(403).json({ error: 'You cannot edit this user' });

        try {
            await User.updateOne({ _id: user._id }, { $set: { name: req.body.name, email: req.body.email } });
            res.json({
                _id: user._id,
                name: req.body.name,
                email: req.body.email,
                group: user.group,
                createdAt: user.createdAt,
                old: {
                    name: user.name,
                    email: user.email
                }
            });
        } catch {
            res.status(500).json({ error: 'Error updating details' });
        }
    }
    else res.status(404).json({ error: 'User not found' });
});

router.patch('/:id/group', restrictTo('admin'), async (req, res) => {
    const { error } = changeGroupValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const user = await User.findById(ObjectId(req.params.id));
    if (user) {
        try {
            await User.updateOne({ _id: user._id }, { $set: { group: req.body.group } });
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                group: req.body.group,
                createdAt: user.createdAt,
                old: {
                    group: user.group
                }
            });
        } catch {
            res.status(500).json({ error: 'Error updating group' });
        }
    }
    else res.status(404).json({ error: 'User not found' });
});

module.exports = router;