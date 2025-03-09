import winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

const logFormat = isProduction
  ? winston.format.json()
  : winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {

      const keysToIgnore = [
        'machine',
        'browser',
        'user-agent',
        'useragent',
        'ip',
        'req',
        'res',
        // 'stack' 
      ];

      const filteredMeta = Object.keys(meta).reduce((acc, key) => {
        if (!keysToIgnore.includes(key.toLowerCase())) {
          acc[key] = meta[key];
        }
        return acc;
      }, {});

      let log = `${timestamp} [${level}]]: ${message}`;

      if (Object.keys(filteredMeta).length > 0) {
        log += ` ${JSON.stringify(filteredMeta)}`;
      }

      return log;
    })
  );

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true
    })
  ],
  exitOnError: false
});

logger.info('Winston logger initialized', {
  environment: process.env.NODE_ENV || 'development',
  logLevel: logger.level
});

export default logger;
