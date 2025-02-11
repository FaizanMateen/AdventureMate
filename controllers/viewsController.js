const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel')
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getOverview = catchAsync(async (req, res) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();

  // 2) Build template
  // 3) Render that template using tour data from
  res.status(200).render('overview', {
    title: 'All Tours',
    tours
  });
});

exports.getTour = catchAsync(async(req, res,next) => {
  // 1) Get the data, for the requested tour (including reviews and guides)
const tour = await Tour.findOne({slug: req.params.slug}).populate({
  path: 'reviews',
  fields:'name rating summary'});
  
  if(!tour){
    return next(new AppError('There is no tour with that name.',404));
  }
  // 2) Build templates
  // 3) Render template using data from 1)
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour
  });
});

exports.getLoginForm = catchAsync(async(req,res,next)=>{
  res.status(200).set(
    'Content-Security-Policy',
    "connect-src 'self' http://127.0.0.1:3000/"
).render('login',{
    title:'Log into your account'
  })
})

exports.getAccount = catchAsync(async(req,res,next)=>{
  res.status(200).set(
    'Content-Security-Policy',
    "connect-src 'self' http://127.0.0.1:3000/"
).render('account',{
    title:'Your account'
  })
})

exports.getMyTours = catchAsync(async(req,res,next)=>{

  // 1) Find all bookings
  const bookings = await Booking.find({user:req.user.id});
  // 2) Find all tours the user has booked
  const tourIDs = bookings.map(el=> el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview',{
    title: 'My Tours',
    tours
  });
})

exports.updateUserData = (req,res,next)=>{
  console.log('UPDATING USER',req.body)
}

exports.updateUserData = catchAsync(async(req,res,next)=>{
  const updatedUser = await User.findByIdAndUpdate(req.user.id,{
    name:req.body.name,
    email:req.body.email
  },
  {
    new:true,
    runValidators:true
  });

  res.status(200).render('account',{
    title:'Your account',
    user: updatedUser
  })
})