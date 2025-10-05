const { withETag } = require('../../utils/etag');

describe('withETag branch coverage', () => {
  function makeReq(headers = {}) { return { headers }; }
  function makeRes() {
    const res = { headers: {}, statusCode: 200, ended: false };
    res.setHeader = (k, v) => { res.headers[k] = v; };
    res.status = (code) => { res.statusCode = code; return res; };
    res.end = () => { res.ended = true; };
    return res;
  }

  test('returns false and sets ETag when no If-None-Match', () => {
    const req = makeReq();
    const res = makeRes();
    const body = JSON.stringify({ a: 1 });
    const handled = withETag(req, res, body);
    expect(handled).toBe(false);
    expect(typeof res.headers.ETag).toBe('string');
    expect(res.statusCode).toBe(200);
    expect(res.ended).toBe(false);
  });

  test('returns true and sends 304 when If-None-Match matches', () => {
    const body = JSON.stringify({ hello: 'world' });
    // First call to compute ETag
    const res1 = makeRes();
    withETag(makeReq(), res1, body);
    const etag = res1.headers.ETag;
    expect(etag).toBeTruthy();

    // Second call with matching If-None-Match should 304 + short-circuit
    const req2 = makeReq({ 'if-none-match': etag });
    const res2 = makeRes();
    const handled2 = withETag(req2, res2, body);
    expect(handled2).toBe(true);
    expect(res2.statusCode).toBe(304);
    expect(res2.ended).toBe(true);
  });
});
