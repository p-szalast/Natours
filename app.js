const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewsRouter = require('./routes/reviewRoutes');

const app = express();

///// 1. Global middlewares

// Set Security HTTP headers (Helmet) - best to use first
app.use(helmet());

// Development logging (Morgan)
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Limit requests from the same API (Express Rate Limit)
const limiter = rateLimit({
    // depends on how many requests in the app is needed
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!',
});

//apply to all requests which start with /api
app.use('/api', limiter);

// Body parser, reading data from body into req.body
// middleware for creating documents
// limit - package larger than 10kb will not be accepted
app.use(express.json({ limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
    hpp({
        whitelist: [
            'duration',
            'ratingsQuantity',
            'ratingsAverage',
            'maxGroupSize',
            'difficulty',
            'price',
        ],
    }),
);

// access to static files:
app.use(express.static(`${__dirname}/public`));

// Other/test middleware
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    // console.log(req.headers)
    next(); //without next function response is stuck
});

///// Routes (also middleware), mounting routers
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewsRouter);
// app.all - all http methods
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this Server`), 404);
});

//Error handling middleware
//when express gets 4 arguments in app.use() it recognizes automatically as error handling middleware
app.use(globalErrorHandler);

module.exports = app;
