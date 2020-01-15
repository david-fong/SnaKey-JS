'use strict';

const PORT_NUM = 8080;

const HTTP  = require('http');
const URL   = require('url');
const FS    = require('fs');



HTTP.createServer((req, res) => {
  
  // Decode the url:
  const url = URL.parse(req.url, true)
  
  // discard leading slash character:
  let path = url.pathname;
  if (path.length == 0) { path = 'index.html'; }
  FS.access(path, (err) => {
    if (err || path.includes('..')) {
      path = 'index.html';
    }
  });
  
  // Get the http content type and query arguments object:
  const query = url.query;
  
  // Respond to a request:
  if (req.method == 'GET') {
    FS.readFile(path, (err, data) => {
      if (err) {
        console.error(err);
        res.statusCode = 400;
      } else {
        res.writeHead(200);
        res.write(data);
      }
      res.end();
    });
    
  }
  if (req.method == 'CONNECT') {
    console.log(req);
  }
  
}).listen(PORT_NUM);
