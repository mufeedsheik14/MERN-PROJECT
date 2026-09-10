const { validationResult } = require('express-validator');

/**
 * Middleware: validate
 * Reads the results of express-validator checks already run on the route,
 * and short-circuits with a 422 response if any validation failed.
 *
 * Usage: place after express-validator check() chains:
 *   router.post('/register', [...checks], validate, controller)
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));

    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: formatted,
    });
  }

  next();
};

module.exports = validate;
