const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!']
  },
  email: {
    type: String,
    required: [true, 'Please provider your email'],
    unique: true,
    lowercase: true,
    validator: [validator.isEmail, 'Please provide a valid email']
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE!!!
      validator: function(el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  }
});

userSchema.pre('save', async function(next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // HASH the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});
// Instance Method below
userSchema.methods.correctPasswords = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// userSchema.methods.incrementLoginAttemps = function() {
//   const lockoutTime = 1 * 60 * 1000;

//   if (this.lockUntil && this.lockUntil > Date.now()) {
//     return this.updateOne({
//       $inc: { loginAttempts: 1 }
//     });
//   }
//   return this.updateOne({
//     $set: { loginAttempts: 1, lockUntil: Date.now() + lockoutTime }
//   });
// };
// const MAX_LOGIN_ATTEMPTS = 5; // Maximum number of login attempts
// const LOCKOUT_DURATION = 1 * 60 * 1000;
// userSchema.methods.increamentLoginAttempts = function() {
//   const MAX_LOGIN_ATTEMPTS = 5;
//   const LOCKOUT_DURATION = 1 * 60 * 1000;

//   if (this.lockUntil && this.lockUntil > Date.now()) {
//     return;
//   }

//   this.loginAttempts += 1;

//   if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
//     this.lockUntil = Date.now() + LOCKOUT_DURATION;
//     this.loginAttempts = 0;
//     // this.updateOne({
//     //   $set: { lockUntil: Date.now() + LOCKOUT_DURATION, loginAttempts: 0 }
//     // });
//   }

//   return this.save({ validateBeforeSave: false });
// };
// userSchema.methods.increamentLoginAttempts = function() {
//   const MAX_LOGIN_ATTEMPTS = 5;
//   const LOCKOUT_DURATION = 1 * 60 * 1000;

//   if (this.lockUntil && this.lockUntil > Date.now()) {
//     return;
//   }

//   this.loginAttempts += 1;
//   if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
//     this.lockUntil = Date.now() + LOCKOUT_DURATION;
//     this.loginAttempts = 0;
//   }
//   return this.save({ validateBeforeSave: false });
// };

// return this.updateOne({
//     $set: { loginAttempts: 1, lockUntil: Date.now() + lockoutTime }
//   });
userSchema.methods.increamentLoginAttempts = function() {
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 1 * 60 * 1000;

  if (this.lockUntil && this.lockUntil > Date.now()) {
    return;
  }
  this.loginAttempts += 1;

  if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    this.lockUntil = Date.now() + LOCKOUT_DURATION;
    this.loginAttempts = 0;
  }
  return this.save({ validateBeforeSave: false });
};

userSchema.methods.resetLoginAttempts = function() {
  this.loginAttempts = 0;
  this.lockUntil = null;
  return this.save({ validateBeforeSave: false });
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    console.log(this.changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
