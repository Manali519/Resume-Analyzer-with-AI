module.exports = ({ windowMs, max, message }) => {
    const hits = new Map();

    setInterval(() => {
        const now = Date.now();
        for (const [ip, entry] of hits) if (entry.resetAt <= now) hits.delete(ip);
    }, windowMs).unref();

    return (req, res, next) => {
        const now = Date.now();
        let entry = hits.get(req.ip);
        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
            hits.set(req.ip, entry);
        }
        entry.count += 1;
        if (entry.count > max) {
            res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
            return res.status(429).json({ error: message });
        }
        next();
    };
};
