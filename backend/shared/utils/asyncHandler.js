// backend/shared/utils/asyncHandler.js
// Wraps async controllers/routes: ang rejected promise ay dadaan sa next(err)
// para umabot sa errorHandler (hindi tahimik na ma-hang ang request).

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
