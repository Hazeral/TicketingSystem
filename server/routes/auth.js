const router = require('express').Router();
const bcrypt = require('bcrypt');
const { generateToken } = require('../token');
const User = require('../models/User');
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

        res.header('auth', token).json({ token: token });
    } catch(err) {
        res.status(400).json({ error: err });
    }
});

router.post('/login', async (req, res) => {
    const { error } = loginValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).json({ error: 'Email not found' });

    const validPass = await bcrypt.compare(req.body.password, user.password);
    if (!validPass) return res.status(400).json({ error: 'Invalid password' });

    const blocked = await Moderation.findOne({ target: user._id, type: 'block', active: true });
    if (blocked) {
        console.log(blocked)
        return res.status(403).json({ error: 'Account blocked' });
    }

    const token = generateToken(user);

    res.header('auth', token).json({ token: token });
});

// reset pass (send email)

module.exports = router;