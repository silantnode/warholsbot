var http = require("http");
var options = {
  hostname: 'maker.ifttt.com',
  port: 80,
  path: 'trigger/new_content/with/key/PcagybV5lLuJVYG2jdgWN',
  method: 'POST',
  headers: {
      'Content-Type': 'application/json',
  }
};
var req = http.request(options, function(res) {
  console.log('Status: ' + res.statusCode);
  console.log('Headers: ' + JSON.stringify(res.headers));
  res.setEncoding('utf8');
  res.on('data', function (body) {
    console.log('Body: ' + body);
  });
});
req.on('error', function(e) {
  console.log('problem with request: ' + e.message);
});
// write data to request body
req.write('{"value1":"@lenarav","value2":"Yay New Article","value3":"http://www.coinspiration.org/warhols-experimental-art-currency/"}');
req.end();