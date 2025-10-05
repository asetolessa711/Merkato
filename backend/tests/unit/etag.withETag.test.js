const crypto = require('crypto');
const { withETag } = require('../../utils/etag');

describe('withETag utility', () => {
  function makeRes() {
    const headers = {};
    return {
      headers,
      statusCode: 200,
      ended: false,
      setHeader(name, value) {
        headers[name] = value;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      end() {
        this.ended = true;
      },
    };
  }

  test('returns false and does not 304 when If-None-Match is absent or different', () => {
    const body = JSON.stringify({ hello: 'world' });
    const req = { headers: {} };
    const res = makeRes();

    const handled = withETag(req, res, body);

    expect(handled).toBe(false);
    expect(res.headers.ETag).toBeDefined();
    expect(res.statusCode).toBe(200); // unchanged
    expect(res.ended).toBe(false);
  });

  test('returns true and sets 304 when If-None-Match matches computed ETag', () => {
    const body = JSON.stringify({ list: [1, 2, 3] });
    const etag = '"' + crypto.createHash('md5').update(body).digest('hex') + '"';
    const req = { headers: { 'if-none-match': etag } };
    const res = makeRes();

    const handled = withETag(req, res, body);

    expect(handled).toBe(true);
    expect(res.headers.ETag).toBe(etag);
    expect(res.statusCode).toBe(304);
    expect(res.ended).toBe(true);
  });
});
