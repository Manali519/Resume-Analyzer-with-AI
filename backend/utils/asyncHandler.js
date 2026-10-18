// Forwards rejected promises from async handlers to the error middleware
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
