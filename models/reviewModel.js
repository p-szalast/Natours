const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
    {
        review: {
            type: String,
            required: [true, 'Review can not be empty!'],
            minLength: [10, 'review must contain at least 10 characters'],
            maxLength: [300, 'review must contain maximum 300 characters'],
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
        },
        createdAt: { type: Date, default: Date.now() },
        tour: {
            type: mongoose.Schema.ObjectId,
            ref: 'Tour',
            required: [true, 'Review must belong to a tour'],
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Review must belong to a user'],
        },
    },
    // Properties not stored in DB
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

// Preventing duplicate reviews:
//Making review: 1 user can create only 1 review to each tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
    // chaining populate
    //
    // this.populate({
    //     path: 'user',
    //     select: 'name',
    // }).populate({
    //     path: 'tour',
    //     select: '-guides name',
    // });

    this.populate({
        path: 'user',
        select: 'name',
    });
    next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
    //static methods: this - current model
    const stats = await this.aggregate([
        {
            $match: { tour: tourId },
        },
        {
            $group: {
                _id: '$tour',
                //for each review 1 is added
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' },
            },
        },
    ]);

    // updating Tour (two ratings fields)
    if (stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating,
        });
    } else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage: 4.5,
        });
    }
};

// Calculating average ratings when ADDING review (post review)
reviewSchema.post('save', function () {
    // this: current review
    // constructor: Review
    this.constructor.calcAverageRatings(this.tour);
});

// Calculating average ratings when UPDATING OR DELETING review (post review)
// for findByIdAndUpdate and findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function (next) {
    // executing this query to get access to document
    // saving it to the document "r" property to get access to it in post middleware
    this.r = await this.findOne();
    next();
});
reviewSchema.post(/^findOneAnd/, async function () {
    // cannot use await this.findOne(); - the query is already executed here
    await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
