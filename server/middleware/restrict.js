const { verifyToken } = require('../token');

module.exports = async (req, res, next) => {
    const token = req.header('auth');
    if (!token) return res.status(401).json({ error: 'Unauthenticated' });

    const user = await verifyToken(token);
    if (user != null) {
        req.user = user;
        next();
    } else {
        return res.status(400).json({ error: 'Unauthenticated' });
    }
};