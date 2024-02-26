//a function that takes function and returns function :>
module.exports = (fn) => (req, res, next) => {
    fn(req, res, next).catch((err) => next(err));
};
