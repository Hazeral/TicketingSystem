const router = require('express').Router();
const Note = require('../models/Note');
const { ObjectId } = require('mongoose').mongo;
const can = require('../middleware/can');
const { flags } = require('../permissions');

router.get('/user/:id', can(flags.VIEW_USER_NOTES), async (req, res) => {
    try {
        const notes = await Note.find({
            reference: { target: ObjectId(req.params.id), type: 'User' }
        }).populate('author', { name: 1, group: 1 });

        res.json(notes);
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.get('/ticket/:id', can(flags.VIEW_TICKET_NOTES), async (req, res) => {
    try {
        const notes = await Note.find({
            reference: { target: ObjectId(req.params.id), type: 'Ticket' }
        }).populate('author', { name: 1, group: 1 });

        res.json(notes);
    } catch {
        res.status(400).json({ error: 'Ticket not found' });
    }
});

router.get('/author/:id', can(flags.VIEW_NOTES_BY_AUTHOR), async (req, res) => {
    try {
        const notes = await Note.find({
            author: ObjectId(req.params.id)
        }).populate('author', { name: 1, group: 1 });

        res.json(notes);
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

module.exports = router;
