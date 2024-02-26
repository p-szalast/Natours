const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please tell us your username'],
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        //transforms email to lowercase
        lowercase: true,
        validate: [validator.isEmail, 'Please enter valid email'],
    },
    photo: String,
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user',
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false,
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            // This only works on "create" and "save"!
            validator: function (el) {
                return el === this.password;
            },
            message: 'Passwords are not the same!',
        },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false,
    },
});

//encrypting password
userSchema.pre('save', async function (next) {
    //if document is not modified return
    if (!this.isModified('password')) return next();

    //hash the password with cost (strength) of 12
    this.password = await bcrypt.hash(this.password, 12);

    //not persisting to DB
    this.passwordConfirm = undefined;
    next();
});

userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next();

    // safety: makes sure that token is always created after the password has been changed
    this.passwordChangedAr = Date.now() - 1000;
    next();
});

userSchema.pre(/^find/, function (next) {
    // regex: /^find/ = starts with "find"
    // this = current query

    // passes only documents with property active Not Equal to false
    // true and without active passes
    this.find({ active: { $ne: false } });
    next();
});

//Comparing password using bcrypt lib
userSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword,
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

//Comparing time of logging in and changing password
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    console.log(this);

    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10,
        );

        // Is time of changing password grater than time of logging in (getting token)?
        return JWTTimestamp < changedTimestamp;
    }

    //False means NOT changed
    return false;
};

userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    console.log({ resetToken }, this.passwordResetToken);

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //10 minutes

    return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
