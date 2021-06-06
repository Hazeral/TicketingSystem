const router = require('express').Router();
const { ObjectId } = require('mongoose').mongo;
const Moderation = require('../models/Moderation');

router.get('/:id', async (req, res) => {
    try {
        const moderation = await Moderation.findById(ObjectId(req.params.id)).populate([{ path: 'author', select: { name: 1, group: 1 } }, { path: 'target', select: { name: 1, group: 1 } }]);
        if (moderation) {
            res.json(moderation);
        }
        else res.status(404).json({ error: 'Moderation not found' });
    } catch {
        res.status(400).json({ error: 'Moderation not found' });
    }
});

module.exports = router;