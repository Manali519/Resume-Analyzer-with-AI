const jwt = require("jsonwebtoken");

const signToken = (userId) =>
    jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        algorithm: "HS256",
        expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    });

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

module.exports = { signToken, verifyToken };
