const joi = require('joi');

module.exports.registerValidation = data => {
    const schema = joi.object({
        name: joi.string().max(25).required(),
        email: joi.string().email().max(100).required(),
        password: joi.string().min(8).required()
    });

    return schema.validate(data);
};

module.exports.loginValidation = data => {
    const schema = joi.object({
        email: joi.string().email().max(100).required(),
        password: joi.string().min(8).required()
    });

    return schema.validate(data);
};

module.exports.changePasswordValidation = data => {
    const schema = joi.object({
        current_password: joi.string().min(8).required(),
        password: joi.string().min(8).required()
    });

    return schema.validate(data);
};

module.exports.changePasswordAdminValidation = data => {
    const schema = joi.object({
        password: joi.string().min(8).required()
    });

    return schema.validate(data);
};

module.exports.changeDetailsValidation = data => {
    const schema = joi.object({
        name: joi.string().max(25).required(),
        email: joi.string().email().max(100).required()
    });

    return schema.validate(data);
};

module.exports.changeGroupValidation = data => {
    const schema = joi.object({
        group: joi.string().valid('user', 'support', 'moderator', 'admin').required()
    });

    return schema.validate(data);
};

module.exports.changeEmailValidation = data => {
    const schema = joi.object({
        email: joi.string().email().max(100).required()
    });

    return schema.validate(data);
};

module.exports.createTicketValidation = data => {
    const schema = joi.object({
        title: joi.string().max(50).required(),
        message: joi.string().max(500).required()
    });

    return schema.validate(data);
};

module.exports.replyTicketValidation = data => {
    const schema = joi.object({
        message: joi.string().max(500).required()
    });

    return schema.validate(data);
};

module.exports.addModerationValidation = data => {
    const schema = joi.object({
        reason: joi.string().max(255).required(),
        expires: joi.date().timestamp()
    });

    return schema.validate(data);
};

module.exports.addNoteValidation = data => {
    const schema = joi.object({
        content: joi.string().max(255).required()
    });

    return schema.validate(data);
};