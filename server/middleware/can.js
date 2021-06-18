const permissions = require('../permissions');

module.exports = (perm) => {
    return async (req, res, next) => {
        const perms = await permissions.total(req.user.groups);
        if (perms & perm) {
            next();
        } else {
            return res.status(403).json({ error: 'Unauthorised' });
        }
    };
};
