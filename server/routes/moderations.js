const router = require('express').Router();
const Moderation = require('../models/Moderation');

router.get('/', async (req, res) => {
    const moderations = await Moderation.find({}).populate('author', { name: 1, group: 1 }).populate('target', { name: 1, group: 1 });

    res.json(moderations);
});

router.get('/active', async (req, res) => {
    const moderations = await Moderation.find({ active: true }).populate('author', { name: 1, group: 1 }).populate('target', { name: 1, group: 1 });

    res.json(moderations);
});

router.get('/inactive', async (req, res) => {
    const moderations = await Moderation.find({ active: false }).populate('author', { name: 1, group: 1 }).populate('target', { name: 1, group: 1 });

    res.json(moderations);
});

module.exports = router;