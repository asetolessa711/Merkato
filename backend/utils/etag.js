const crypto = require('crypto');

/**
 * Sets ETag header and returns true if response was handled with 304 Not Modified.
 * Usage:
 *   const body = JSON.stringify(data);
 *   if (withETag(req, res, body)) return; // sent 304
 *   res.setHeader('Content-Type', 'application/json');
 *   res.end(body);
 */
function withETag(req, res, body) {
  try {
    const etag = '"' + crypto.createHash('md5').update(body).digest('hex') + '"';
    res.setHeader('ETag', etag);
    const inm = req.headers['if-none-match'];
    if (inm && inm === etag) {
      res.status(304).end();
      return true;
    }
  } catch (_) {
    // best-effort only
  }
  return false;
}

module.exports = { withETag };
