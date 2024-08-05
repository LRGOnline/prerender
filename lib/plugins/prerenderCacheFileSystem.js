var fs = require('fs');
var path = require('path');
var cacheManager = require('cache-manager');

module.exports = {
  init: function () {
    this.cache = cacheManager.caching({
      store: 'memory',
      max: process.env.CACHE_MAXSIZE || 100,
      ttl: process.env.CACHE_TTL || 60 /*seconds*/,
    });
    this.cacheDir = path.join(
      process.env.PRERENDER_CACHE_LOCATION || process.cwd(),
      'cache',
    );
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir);
    }
  },

  requestReceived: function (req, res, next) {
    var cacheFile = path.join(
      this.cacheDir,
      encodeURIComponent(req.prerender.url),
    );

    this.cache.get(req.prerender.url, function (err, result) {
      if (!err && result) {
        req.prerender.cacheHit = true;
        res.send(200, result);
        console.log('Memory cache hit for url: ' + req.prerender.url);
      } else {
        fs.stat(cacheFile, function (err, stats) {
          if (err) {
            next();
          } else {
            var currentTime = new Date().getTime();
            var fileTime = new Date(stats.mtime).getTime();
            var twoDays = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds

            if (currentTime - fileTime > twoDays) {
              // The cache file is more than 2 days old, invalidate it
              next();
            } else {
              // The cache file is still valid, read it
              fs.readFile(cacheFile, 'utf8', function (err, result) {
                if (!err && result) {
                  req.prerender.cacheHit = true;
                  res.send(200, result);
                  console.log('File cache hit for url: ' + req.prerender.url);
                } else {
                  next();
                }
              });
            }
          }
        });
      }
    });
  },

  beforeSend: function (req, res, next) {
    if (!req.prerender.cacheHit && req.prerender.statusCode == 200) {
      var cacheFile = path.join(
        this.cacheDir,
        encodeURIComponent(req.prerender.url),
      );
      fs.writeFile(cacheFile, req.prerender.content, function (err) {
        if (err) {
          console.error('Error writing cache file:', err);
        }
      });
      this.cache.set(req.prerender.url, req.prerender.content);
    }
    next();
  },
};
