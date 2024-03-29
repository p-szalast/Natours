class APIFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    filter() {
        const queryObj = { ...this.queryString };
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        excludedFields.forEach((el) => delete queryObj[el]);

        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(
            /\b(gte|gt|lte|lt)\b/g,
            (match) => `$${match}`,
        );

        this.query = this.query.find(JSON.parse(queryStr));

        return this; //returns the entire object
    }

    sort() {
        if (this.queryString.sort) {
            //splitting arguments from query string:
            const sortBy = this.queryString.sort.split(',').join(' ');
            // sorting
            this.query = this.query.sort(sortBy);
        } else {
            //default sorting:
            this.query = this.query.sort('-createdAt');
        }
        return this;
    }

    limitFields() {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ');
            //projecting
            // query = query.select('name duration price');
            this.query = this.query.select(fields);
        } else {
            //excluding field "__v" (mongoose default field)
            this.query = this.query.select('-__v');
        }

        return this;
    }

    paginate() {
        const page = this.queryString.page * 1 || 1; //converting string to number
        const limit = this.queryString.limit * 1 || 100;

        const skip = (page - 1) * limit;
        // page 1: 1-10
        // page 2: 11-20

        this.query = this.query.skip(skip).limit(limit);

        return this;
    }
}

module.exports = APIFeatures;
