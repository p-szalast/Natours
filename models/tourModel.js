const mongoose = require('mongoose');
const slugify = require('slugify');
const User = require('./userModel');
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'A tour must have a name'],
            unique: true,
            trim: true,
            maxlength: [
                40,
                'A tour name must have less or equal then 40 characters',
            ],
            minlength: [
                10,
                'A tour name must have more or equal then 10 characters',
            ],
            // validate: [
            //     validator.isAlpha,
            //     'Tour name must only contain characters',
            // ],
        },
        slug: String,
        duration: {
            type: Number,
            required: [true, 'A tour must have a duration'],
        },
        maxGroupSize: {
            type: Number,
            required: [true, 'A tour must have a group size'],
        },
        difficulty: {
            type: String,
            required: [true, 'A tour must have a difficulty'],
            enum: {
                values: ['easy', 'medium', 'difficult'],
                message: 'Difficulty is either: easy, medium, difficult',
            },
        },
        ratingsAverage: {
            type: Number,
            default: 4.5,
            min: [1, 'Rating must be above 1.0'],
            max: [5, 'Rating must be below 5.0'],
            set: (val) => Math.round(val * 10) / 10, // method rounds to integer
        },
        ratingsQuantity: {
            type: Number,
            default: 0,
        },
        price: {
            type: Number,
            required: [true, 'A tour must have a price'],
        },
        priceDiscount: {
            type: Number,
            validate: {
                validator: function (val) {
                    // this refers to a value ONLY WHEN CREATING NEW DOCUMENT (not updating)
                    return val < this.price;
                },
            },
            //mongoose syntax (message property has access to the value)
            message: 'Discount price ({VALUE}) should be below regular price',
        },
        summary: {
            type: String,
            trim: true,
            required: [true, 'A tour must have a description'],
        },
        description: {
            type: String,
            trim: true,
        },
        imageCover: {
            type: String,
            required: [true, 'A tour must have a cover image'],
        },
        images: [String],
        createdAt: {
            type: Date,
            default: Date.now(),
            //excluding from sending (permanently hide from the output)
            select: false,
        },
        startDates: [Date],
        secretTour: {
            type: Boolean,
            default: false,
        },
        startLocation: {
            // GeoJSON
            type: {
                type: String,
                default: 'Point', //Poligons, lines etc
                enum: ['Point'],
            },
            coordinates: [Number],
            address: String,
            description: String,
        },
        locations: [
            {
                type: {
                    type: String,
                    default: 'Point',
                    enum: ['Point'],
                },
                coordinates: [Number],
                address: String,
                description: String,
                day: Number,
            },
        ],
        // Embedding
        // guides: Array,
        // Child referencing
        guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

// Adding indexes to most queried field
// (db engine examines only indexed fields instead of all collection)
// 1:ascending, -1:descending
// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });

// geospatial indexing - obligatory for geo queries
tourSchema.index({ startLocation: '2dsphere' });

//properties not persisted on DB, but calculated on the run when getting the data
//cannot be part of query
tourSchema.virtual('durationWeeks').get(function () {
    return this.duration / 7;
});

//Virtual populate (connecting two models together)
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour',
    localField: '_id',
});

//MONGOOSE MIDDLEWARES

// Document Middleware - runs before .save() and .create()

// this - document
// !not e.g. update/findByIdAndUpdate!

// e.g.
// tourSchema.post('save', (doc, next) => {
//     console.log(doc);
//     next();
// });

tourSchema.pre('save', function (next) {
    //this - the document right before save
    this.slug = slugify(this.name, { lower: true });
    next();
});

tourSchema.pre('save', async function (next) {
    const guidesPromises = this.guides.map(
        async (id) => await User.findById(id),
    );
    this.guides = await Promise.all(guidesPromises);

    next();
});

//Query Middleware
// (this - pre: query. post: all documents)

//all expressions that start from "find"
tourSchema.pre(/^find/, function (next) {
    //this - query
    //secretTour property not equal to true
    this.find({ secretTour: { $ne: true } });

    this.start = Date.now();
    next();
});

tourSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'guides',
        //-<filename> (starts with minus)
        select: '-__v -passwordChangedAt',
    });
    next();
});

tourSchema.post(/^find/, function (docs, next) {
    //this - all documents
    //secretTour property not equal to true
    console.log(`Query tooks ${Date.now() - this.start} miliseconds`);
    next();
});

//Aggregation Middleware
//this - current aggregation abject

// tourSchema.pre('aggregate', function (next) {
//     console.log(this.pipeline());
//     this.pipeline().unshift({
//         $match: {
//             secretTour: { $ne: true },
//         },
//     });
//     next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
