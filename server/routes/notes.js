const router = require('express').Router();
const Note = require('../models/Note');
const { ObjectId } = require('mongoose').mongo;
const restrictTo = require('../middleware/restrictTo');

router.get('/user/:id', async (req, res) => {
    try {
        const notes = await Note.find({ reference: { target: ObjectId(req.params.id), type: 'User' } })
        .populate('author', { name: 1, group: 1 });
    
        res.json(notes);
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.get('/ticket/:id', async (req, res) => {
    try {
        const notes = await Note.find({ reference: { target: ObjectId(req.params.id), type: 'Ticket' } })
        .populate('author', { name: 1, group: 1 });
    
        res.json(notes);
    } catch {
        res.status(400).json({ error: 'Ticket not found' });
    }
});

router.get('/author/:id', restrictTo('admin'), async (req, res) => {
    try {
        const notes = await Note.find({ author: ObjectId(req.params.id) })
        .populate('author', { name: 1, group: 1 });
    
        res.json(notes);
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

module.exports = router;