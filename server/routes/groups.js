const router = require('express').Router();
const Group = require('../models/Group');
const can = require('../middleware/can');
const { flags } = require('../permissions');

router.get('/', can(flags.VIEW_GROUPS), async (req, res) => {
    const groups = await Group.find({}).populate({
        path: 'author',
        select: { password: 0 }
    });

    res.json(groups);
});

router.get('/can/:flag', can(flags.VIEW_GROUPS_BY_FLAG), async (req, res) => {
    if (isNaN(parseInt(req.params.flag)) || parseInt(req.params.flag) < 2)
        return res.status(400).json({ error: 'Invalid flag provided' });
    if (Object.values(flags).indexOf(BigInt(req.params.flag)) == -1)
        return res.status(400).json({ error: 'Flag does not exist' });

    const groups = await Group.find({}).populate({
        path: 'author',
        select: { password: 0 }
    });

    res.json(
        groups.filter((g) => BigInt(g.permissions) & BigInt(req.params.flag))
    );
});

module.exports = router;
