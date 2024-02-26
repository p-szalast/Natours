class AppError extends Error {
    constructor(message, statusCode) {
        //allways when extending
        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        //1 - current object
        //2 - app error class itself
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
