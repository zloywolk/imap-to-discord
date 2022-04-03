const config = require('../config');
const CustomFormatter = require('./custom');
const DefaultFormatter = require('./default');

module.exports = function formatter(logger, options) {
  if (!options) {
    options = { Type: 'Default' };
  }
  const type = config('Type', undefined, options);
  switch (type) {
    case 'Default': return new DefaultFormatter(logger, options);
    case 'Custom': return new CustomFormatter(logger, options);
    default: {
      logger.error('Unknown formatter type ' + type);
      throw new Error('Unknown formatter type ' + type);
    }
  }
}
