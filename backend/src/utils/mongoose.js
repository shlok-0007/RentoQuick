// 6.3 — Consistent ObjectId comparison helper
const { ObjectId } = require('mongoose').Types;

const sameId = (a, b) => {
    if (!a || !b) return false;
    if (a instanceof ObjectId && b instanceof ObjectId) return a.equals(b);
    return String(a) === String(b);
};

module.exports = { sameId };
