'use strict';

const PORT_NUM = 8080;

const HTTP  = require('http');
const URL   = require('url');
const FS    = require('fs');



HTTP.createServer((req, res) => {
  
  // Decode the url:
  const url = URL.parse(req.url, true)
  let  path = url.pathname.slice(1);
  if (path.length == 0) { path = 'index.html'; }
  FS.access(path, (err) => {
    if (err || path.includes('..')) {
      path = 'index.html';
    }
  });
  const ctype = contentTypes[path.split('.').pop().toLowerCase()];
  const query = url.query;
  console.log(url, path, ctype);
  
  // Respond to a request:
  if (req.method == 'GET') {
    
    // Clean the path argument:
    FS.readFile(path, (err, data) => {
      if (err) {
        console.error(err);
        res.statusCode = 400;
      } else {
        res.writeHead(200, {'Content-Type': ctype});
        res.write(data);
      }
      res.end();
    });
    
  } else {
    res.statusCode = 404;
    res.end();
  }
  
}).listen(PORT_NUM);



const contentTypes = {
  'html': 'text/html',
  'js':   'text/javascript',
  'css':  'text/css',
  
  'png':  'image/png',
  'ico':  'image/png',
  'wav':  'audio/wav',
  'mp3':  'audio/mpeg',
}
