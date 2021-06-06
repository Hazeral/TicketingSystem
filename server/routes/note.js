const router = require('express').Router();
const { ObjectId } = require('mongoose').mongo;
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Note = require('../models/Note');
const restrictTo = require('../middleware/restrictTo');
const { addNoteValidation } = require('../validation');

router.post('/user/:id', async (req, res) => {
    const { error } = addNoteValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const user = await User.findById(ObjectId(req.params.id));
        if (user) {
            const note = new Note({
                author: req.user._id,
                content: req.body.content,
                reference: {
                    target: user._id,
                    type: 'User'
                }
            });
    
            try {
                const savedNote = await note.save();
                const populatedNote = await Note.populate(savedNote, [{ path: 'author', select: { name: 1, group: 1 } }]);

                res.json(populatedNote);
            } catch(err) {
                res.status(400).json({ error: 'Could not add note' });
            }
        }
        else res.status(404).json({ error: 'User not found' });
    } catch {
        res.status(400).json({ error: 'User not found' });
    }
});

router.post('/ticket/:id', async (req, res) => {
    const { error } = addNoteValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const ticket = await Ticket.findById(ObjectId(req.params.id));
        if (ticket) {
            const note = new Note({
                author: req.user._id,
                content: req.body.content,
                reference: {
                    target: ticket._id,
                    type: 'Ticket'
                }
            });
    
            try {
                const savedNote = await note.save();
                const populatedNote = await Note.populate(savedNote, [{ path: 'author', select: { name: 1, group: 1 } }]);

                res.json(populatedNote);
            } catch(err) {
                res.status(400).json({ error: 'Could not add note' });
            }
        }
        else res.status(404).json({ error: 'Ticket not found' });
    } catch {
        res.status(400).json({ error: 'Ticket not found' });
    }
});

router.delete('/:id', restrictTo('admin'), async (req, res) => {
    try {
        const note = await Note.findByIdAndDelete(ObjectId(req.params.id));

        const populatedNote = await Note.populate(note, [{ path: 'author', select: { name: 1, group: 1 } }]);
        if (note) res.json(populatedNote);
        else res.status(404).json({ error: 'Note not found' });
    } catch(err) {
        console.log(err)
        res.status(400).json({ error: 'Note not found' });
    }
});

module.exports = router;