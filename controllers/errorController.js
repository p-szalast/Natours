const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
    //path - property name
    //value - entered value
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
    //workaround 2023
    const value = Object.values(err.keyValue)[0];
    // const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
    const message = `Duplicate field value: ${value}. Please use another value`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message);

    const message = `Invalid input data. ${errors.join('. ')}`;

    return new AppError(message, 400);
};

const handleJWTError = () =>
    new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
    new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
    });
};

const sendErrorProd = (err, res) => {
    //Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    } else {
        // Programming of other unknown error: don't leak error details
        // 1) log error:
        console.error('Error:', err);

        // 2) send generic message
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong!',
        });
    }
};

module.exports = (err, req, res, next) => {
    //stack trace - tracing errors
    // console.log(err.stack);

    err.statusCode = err.statusCode || 500; // internal server error
    err.status = err.status || 'error';

    //differing errors for dev and prod
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === 'production') {
        //WRONG ID (unable to convert)
        let error = {
            ...err,
            //2023 workaround
            name: err.name,
        };

        // handling get with wrong ID
        if (error.name === 'CastError') {
            error = handleCastErrorDB(error);
        }

        // post with duplicate unique field in DB
        if (error.code === 11000) {
            error = handleDuplicateFieldsDB(error);
        }

        if (error.name === 'ValidationError') {
            error = handleValidationErrorDB(error);
        }

        if (error.name === 'JsonWebTokenError') {
            error = handleJWTError(error);
        }

        if (error.name === 'TokenExpiredError') {
            error = handleJWTExpiredError(error);
        }

        sendErrorProd(error, res);
    }
};
