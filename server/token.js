const jwt = require('jsonwebtoken');
const User = require('./models/User');

module.exports.generateToken = user => {
    return jwt.sign({ id: user._id, valid: (user.password).slice(-3) }, process.env.JWT_SIG);
    // 'valid' is last 3 characters of pass hash, this is so that the token invalidates when password is changed
}

module.exports.verifyToken = async token => {
    try {
        const verified = jwt.verify(token, process.env.JWT_SIG);
        const user = await User.findOne({ _id: verified.id }).populate([{ path: 'muted' }, { path: 'blocked' }]);
        if (verified.valid != (user.password).slice(-3)) return null;
        return user;
    } catch (err) {
        return null;
    }
}