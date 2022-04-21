const config = require('../config');
const CustomFormatter = require('./custom');
const DebugFormatter = require('./debug');
const DefaultFormatter = require('./default');

module.exports = function formatter(logger, options) {
  if (!options) {
    options = { Type: 'Default' };
  }
  if (typeof options === 'string') {
    options = { Type: options };
  }
  const type = config('Type', undefined, options);
  switch (type) {
    case 'Default': return new DefaultFormatter(logger, options);
    case 'Custom': return new CustomFormatter(logger, options);
    case 'Debug': return new DebugFormatter(logger, options);
    default: {
      logger.error('Unknown formatter type ' + type);
      throw new Error('Unknown formatter type ' + type);
    }
  }
}
