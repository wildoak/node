'use strict';

const common = require('../common');
if (!common.hasCrypto)
  common.skip('missing crypto');
const http2 = require('http2');
const assert = require('assert');
const stream = require('stream');

const dataStream = new stream.Readable();
dataStream._read = () => {};
dataStream.push('hello world');
dataStream.push(null);

const {
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_CONTENT_LENGTH
} = http2.constants;


const server = http2.createServer();
server.on('stream', (stream) => {
  stream.respondWithStream(dataStream, {
    [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain',
    [HTTP2_HEADER_CONTENT_LENGTH]: 'hello world'.length,
  });
});
server.on('close', common.mustCall());
server.listen(0, () => {

  const client = http2.connect(`http://localhost:${server.address().port}`);
  const req = client.request();

  req.on('response', common.mustCall((headers) => {
    assert.strictEqual(headers[HTTP2_HEADER_CONTENT_TYPE], 'text/plain');
    assert.strictEqual(+headers[HTTP2_HEADER_CONTENT_LENGTH],
                       'hello world'.length);
  }));
  req.setEncoding('utf8');
  let check = '';
  req.on('data', (chunk) => check += chunk);
  req.on('end', common.mustCall(() => {
    assert.strictEqual(check, 'hello world'.toString('utf8'));
    client.close();
    server.close();
  }));
  req.end();
});
