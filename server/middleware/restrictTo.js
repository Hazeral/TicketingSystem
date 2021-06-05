module.exports = (...groups) => {
    return (req, res, next) => {
        if (groups.includes(req.user.group)) {
            next();
        } else {
            return res.status(403).json({ error: 'Unauthorised' });
        }
    };
}