const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (err) {
        if (!err || typeof err.errors?.map !== 'function') return next(err);
        const errors = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
        res.status(400).json({ success: false, message: errors[0]?.message || 'Validation failed', errors });
    }
};
module.exports = validate;
