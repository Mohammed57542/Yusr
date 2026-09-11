const requests = new Map();

function rateLimit(windowMs = 60000, max = 30) {
  return (req, res, next) => {
    const key = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const record = requests.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }
    record.count++;
    requests.set(key, record);

    if (record.count > max) {
      res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000));
      return res.status(429).json({
        error: 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة لاحقاً'
      });
    }
    next();
  };
}

export default rateLimit;
