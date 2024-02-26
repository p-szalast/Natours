const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

////// middleware for aliasing
exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage,price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
};

////// route handlers

exports.getAllTours = factory.getAll(Tour);

// BASIC VERSION (no factory)
// exports.getAllTours = catchAsync(async (req, res, next) => {
//     // EXECUTE QUERY
//     const features = new APIFeatures(Tour.find(), req.query)
//         .filter()
//         .sort()
//         .limitFields()
//         .paginate();
//     const tours = await features.query;

//     // SEND QUERY
//     res.status(200).json({
//         status: 'success',
//         results: tours.length,
//         data: {
//             tours,
//         },
//     });
// });

// query with populate
exports.getTour = factory.getOne(Tour, { path: 'reviews' });

// BASIC VERSION (no factory)
// exports.getTour = catchAsync(async (req, res, next) => {
//     //Simple:
//     // const tour = await Tour.findById(req.params.id);

//     //With Populating:
//     // const tour = await Tour.findById(req.params.id).populate('guides');

//     // const tour = await Tour.findById(req.params.id).populate({
//     //     path: 'guides',
//     //     //-<filename> (starts with minus)
//     //     select: '-__v -passwordChangedAt',
//     // });

//     //Virtual Populating:
//     const tour = await Tour.findById(req.params.id).populate('reviews');

//     //equals:
//     //Tour.findOne({ _id: req.params.id })

//     if (!tour) {
//         return next(new AppError('No tour found with that ID', 404));
//     }

//     res.status(200).json({
//         status: 'success',
//         data: {
//             tour,
//         },
//     });
// });

exports.createTour = factory.createOne(Tour);

// BASIC VERSION (no factory)
// exports.createTour = catchAsync(async (req, res, next) => {
//     const newTour = await Tour.create(req.body);

//     res.status(201).json({
//         status: 'success',
//         data: {
//             tour: newTour,
//         },
//     });

//     // try {
//     // } catch (err) {
//     //     res.status(400).json({
//     //         status: 'fail',
//     //         message: err,
//     //     });
//     // }
//     // const newTour = new Tour({});
//     // newTour.save();

//     // opt for sending response
//     // res.send('Done');

// });

exports.updateTour = factory.updateOne(Tour);

// BASIC VERSION (no factory)
//for patching (updating property and leave ORIGINAL OBJECT except for this property)
// exports.updateTour = catchAsync(async (req, res, next) => {
//     const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//         new: true, // returns updated document
//         runValidators: true, // allows to e.g. validate req.body if property fits the schema types
//     });

//     if (!tour) {
//         return next(new AppError('No tour found with that ID', 404));
//     }

//     res.status(200).json({
//         status: 'success',
//         data: {
//             tour,
//         },
//     });
// });

exports.deleteTour = factory.deleteOne(Tour);

// BASIC VERSION (no factory)
// exports.deleteTour = catchAsync(async (req, res, next) => {
//     const tour = await Tour.findByIdAndDelete(req.params.id);

//     if (!tour) {
//         return next(new AppError('No tour found with that ID', 404));
//     }

//     res.status(204).json({
//         status: 'success',
//         data: null,
//     });
// });

exports.getTourStats = catchAsync(async (req, res, next) => {
    const stats = await Tour.aggregate([
        //array of stages
        {
            $match: { ratingsAverage: { $gte: 4.5 } },
        },
        {
            $group: {
                // _id can be null or grouped by _id value
                _id: { $toUpper: '$difficulty' },
                numTours: { $sum: 1 },
                numRatings: { $sum: '$ratingsQuantity' },
                avgRating: { $avg: '$ratingsAverage' },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' },
            },
        },
        {
            $sort: { avgPrice: 1 }, // 1 - ascending
        },
        // {
        //   $match: { _id: { $ne: 'EASY' } }
        // }
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            stats,
        },
    });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
    const year = req.params.year * 1; // converting to number

    const plan = await Tour.aggregate([
        //restructure
        {
            //osobny record dla każdego elementu z array:
            // zamiast 1 rekord z startDates: [3elementy] -> 3 rekordy z startDates: 1element (bez array)
            $unwind: '$startDates',
        },
        // query - choosing fields (here: year from request)
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`),
                },
            },
        },
        //group
        {
            $group: {
                _id: {
                    $month: '$startDates',
                },
                numTourStarts: {
                    $sum: 1,
                },
                tours: { $push: '$name' },
            },
        },
        //adding field
        {
            $addFields: {
                month: '$_id',
            },
        },
        //hiding field
        {
            $project: {
                _id: 0,
            },
        },
        //sorting descending
        {
            $sort: {
                numTourStarts: -1,
            },
        },
        //limiting records (only as reference: not useful in this case)
        {
            $limit: 12,
        },
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            plan,
        },
    });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    // converting distance to radius
    // distance divided by Earth radius (in miles or kilometers)
    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

    if (!lat || !lng) {
        next(
            new AppError(
                'Please provide latitude and longitude in the format lat,lng.',
                400,
            ),
        );
    }

    //for geospatial queries: obligatory to add index to the first <argument> (here startLocation)
    const tours = await Tour.find({
        startLocation: {
            // must be the first step in aggregation pipeline
            // watch out for other middleware
            //(e.g. console.log(this.pipeline()))
            $geoWithin: {
                $centerSphere: [[lng, lat], radius],
            },
        },
    });

    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            data: tours,
        },
    });
});

exports.getDistances = catchAsync(async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

    if (!lat || !lng) {
        next(
            new AppError(
                'Please provide latitude and longitude in the format lat,lng.',
                400,
            ),
        );
    }

    const distances = await Tour.aggregate([
        // requires at least 1 field with geospatial index
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    // multiplying by 1 to convert to numbers
                    coordinates: [lng * 1, lat * 1],
                },
                distanceField: 'distance',
                // converting meters to kilometers
                distanceMultiplier: multiplier,
            },
        },
        {
            // which fields will be sent
            $project: {
                distance: 1,
                name: 1,
            },
        },
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            data: distances,
        },
    });
});
