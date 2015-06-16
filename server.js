'use strict'

var http = require('http')
  , httpProxy = require('http-proxy')
  , url = require('url')
  ;

http.globalAgent.maxSockets = Infinity;

var proxy = httpProxy.createProxyServer({secure: false});

proxy.on('error', function (error, req, res) {
  console.log('proxy error', error);
  if (!res.headersSent) {
    res.writeHead(500, { 'content-type': 'application/json' });
  }
  var json = { error: 'proxy_error', reason: error.message };
  res.end(JSON.stringify(json));
});

var token = process.env.ACCESS_TOKEN || '';

var config = {
  openshiftServer: 'https://' + (process.env.OPENSHIFT_SERVER || 'openshift-master.summit.paas.ninja:8443')
, port: process.env.OPENSHIFT_NODEJS_PORT || 8080
, hostname: process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0'
};

var re = /^\/([a-z0-9\-]*)\/([a-z0-9\-]*)/;

var server = http.createServer(function(req, res) {
  if (req.url.indexOf('/api/v1beta3/namespaces/') !== 0) {
    var parsed = url.parse(req.url);
    var results = parsed.pathname.match(re);
    if (results) {
      var apiUrl = '/api/v1beta3/namespaces/' + results[1] + '/pods/'+ results[2] +'/proxy';
      var oldUrl = req.url.substring(results[0].length)
      req.url = apiUrl + oldUrl;
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.write('<html><body><h3>Invalid url.</h3><p>Specify a correct namespace and pod name in the URL as in:</p>');
      res.write('<p>http://1k.jbosskeynote.com/{namespace}/{pod_name}</p>');
      res.end();
      return;
    }
  };

  req.headers.authorization = 'Bearer ' + token;
  console.log(req.url);
  proxy.web(req, res, { target: config.openshiftServer });
});

console.log('listening on', config.hostname, ':', config.port)
server.listen(config.port, config.hostname);
