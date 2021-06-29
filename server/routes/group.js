const router = require('express').Router();
const { ObjectId } = require('mongoose').mongo;
const Group = require('../models/Group');
const User = require('../models/User');
const can = require('../middleware/can');
const { flags } = require('../permissions');
const { createGroupValidation, editGroupValidation } = require('../validation');

router.get('/:id', can(flags.VIEW_GROUP), async (req, res) => {
    try {
        const group = await Group.findOne({
            _id: ObjectId(req.params.id)
        }).populate({ path: 'author', select: { password: 0 } });

        if (group) res.json(group);
        else res.status(404).json({ error: 'Group not found' });
    } catch {
        res.status(400).json({ error: 'Group not found' });
    }
});

router.patch('/:id', can(flags.EDIT_GROUP), async (req, res) => {
    const { error } = editGroupValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const group = await Group.findOne({
            _id: ObjectId(req.params.id)
        });

        if (group) {
            if (req.body.name) group.name = req.body.name;
            if (req.body.type) group.type = req.body.type;
            if (req.body.default) group.default = req.body.default;
            if (req.body.permissions)
                group.permissions = BigInt(req.body.permissions);

            const updatedGroup = await Group.findByIdAndUpdate(
                ObjectId(req.params.id),
                {
                    $set: {
                        name: group.name,
                        type: group.type,
                        default: group.default,
                        permissions: group.permissions
                    }
                }
            );
            const populatedGroup = await Group.populate(group, [
                { path: 'author', select: { password: 0 } }
            ]);

            res.json(populatedGroup);
        } else res.status(404).json({ error: 'Group not found' });
    } catch {
        res.status(400).json({ error: 'Group not found' });
    }
});

router.get('/:id/users', can(flags.VIEW_USERS_BY_GROUP), async (req, res) => {
    try {
        const group = await Group.findOne({
            _id: ObjectId(req.params.id)
        }).populate({ path: 'author', select: { password: 0 } });

        if (group) {
            try {
                const users = await User.find({ groups: group._id })
                    .select({ password: 0 })
                    .populate('muted')
                    .populate('blocked')
                    .populate('groups');
                res.json(users);
            } catch {
                res.status(500).json({ error: 'Error retrieving users' });
            }
        } else res.status(404).json({ error: 'Group not found' });
    } catch {
        res.status(400).json({ error: 'Group not found' });
    }
});

router.post('/', can(flags.CREATE_GROUP), async (req, res) => {
    const { error } = createGroupValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const sameName = await Group.findOne({ name: req.body.name });
    if (sameName)
        return res
            .status(400)
            .json({ error: 'A group with the same name already exists' });

    try {
        const group = new Group({
            name: req.body.name,
            type: req.body.type || 'add',
            permissions: BigInt(req.body.permissions),
            author: req.user._id,
            default: req.body.default == 'true' ? true : false // validation will only accept ['true', 'false'] so it's fine put false into else
        });

        try {
            const savedGroup = await group.save();
            const populatedGroup = await Group.populate(savedGroup, [
                { path: 'author', select: { password: 0 } }
            ]);

            res.json(populatedGroup);
        } catch (err) {
            res.status(400).json({ error: 'Could not create group' });
        }
    } catch {
        res.status(400).json({ error: 'Could not create group' });
    }
});

router.delete('/:id', can(flags.DELETE_GROUP), async (req, res) => {
    try {
        const group = await Group.findByIdAndDelete(ObjectId(req.params.id));

        if (group) {
            const populatedGroup = await Group.populate(group, [
                { path: 'author', select: { password: 0 } }
            ]);

            const usersList = await User.find({ groups: group._id }).select({
                password: 0,
                groups: 0
            });

            const users = await User.updateMany(
                { groups: group._id },
                { $pull: { groups: group._id } }
            );

            res.json({
                group: populatedGroup,
                users: usersList
            });
        } else res.status(404).json({ error: 'Group not found' });
    } catch (err) {
        console.log(err);
        res.status(400).json({ error: 'Group not found' });
    }
});

module.exports = router;
