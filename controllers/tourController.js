// const fs = require('fs');
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');
const sharp = require('sharp');
const multer = require('multer');

// const multerStorage = multer.diskStorage({
//   destination:(req,file,cb)=>{
//     cb(null,'public/img/users');
//   },
//   filename:(req,file,cb)=>{
//     const ext = file.mimetype.split('/')[1];
//     // user-1234567890abcde-1234567890.jpeg [Example: for below string]
//     cb(null,`user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// })

// const upload = multer({dest:'public/img/users'});

const multerStorage = multer.memoryStorage();

const multerFilter = (req,file,cb)=>{
  if(file.mimetype.startsWith('image')){
    cb(null,true);
  }else{
    cb(new AppError('Not an image! Please upload only images.',400),false);
  }
}

const upload = multer({
  storage:multerStorage,
  fileFilter:multerFilter
});

exports.uploadTourImages = upload.fields([
  {name:'imageCover',maxCount:1},
  {name:'images',maxCount:3}
]);

exports.resizeTourImages = catchAsync(async(req,res,next)=>{
  if(!req.files.imageCover || !req.files.images) return next();

  //1) Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
      .resize(2000,1333)
      .toFormat('jpeg')
      .jpeg({quality:90})
      .toFile(`public/img/tours/${req.body.imageCover}`);

  //2) Images
  req.body.images = [];
  
  await Promise.all(req.files.images.map(async(file,i)=>{
    const filename=`tour-${req.params.id}-${Date.now()}-${i+1}.jpeg`;

    await sharp(file.buffer)
      .resize(2000,1333)
      .toFormat('jpeg')
      .jpeg({quality:90})
      .toFile(`public/img/tours/${filename}`);

    req.body.images.push(filename);
  }));
  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.checkBody = (req, res, next) => {
  if (!req.body.price || !req.body.name) {
    return res.status(400).json({
      status: 'fail',
      message: 'Missing name and price'
    });
  }
  next();
};

exports.getAllTours = factory.getAll(Tour);
// exports.getAllTours = catchAsync(async (req, res, next) => {
//   // EXECUTE QUERY
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();

//   const tours = await features.query;
//   // SEND RESPONSE
//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: {
//       tours
//     }
//   });
// });

exports.getTour = factory.getOne(Tour, { path: 'reviews' });
// exports.getTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findById(req.params.id).populate('reviews');

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour
//     }
//   });
// });

// const catchAsync = fn => {
//   return (req, res, next) => {
//     fn(req, res, next).catch(err => next(err));
//   };
// };

// exports.createOne = factory.createOne(Tour);
// Error Route.post() requires a callback function but got a [object Undefined] [Side:note This error occoured because of the above code, exports.createOne was written instead of exports.createTour]

exports.createTour = factory.createOne(Tour);
// exports.createTour = catchAsync(async (req, res, next) => {
//   const newTour = await Tour.create(req.body);
//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour
//     }
//   });
// });

exports.updateTour = factory.updateOne(Tour);
// exports.updateTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true, //new: If set to true, the method will return the updated document instead of the original document.
//     runValidators: true //runValidators: If set to true, Mongoose will run validation on the updated data according to the schema defined for the model. This ensures that the new data adheres to the rules specified in the schema.
//   });
//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour
//     }
//   });
// });

exports.deleteTour = factory.deleteOne(Tour);
// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(204).json({
//     status: 'success',
//     data: null
//   });
// });

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRating: { $avg: '$ratingsAverage' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $min: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
    // {
    //   $match: { _id: { $ne: 'EASY' } }
    // }
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: { month: { $toString: '$_id' } }
    },
    {
      $project: { _id: 0 }
    },
    {
      $sort: { numTourStarts: -1 }
    },
    {
      $limit: 12
    }
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});

// /tours-within/233/center/-40,45/unit/mi [The actual URL]
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
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
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});
