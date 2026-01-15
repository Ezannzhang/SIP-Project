const connect = require('connect');
const serveStatic = require('serve-static');
const finalhandler = require('finalhandler');
const http = require('http');
const https = require('https');
const fs = require('fs');

const port = process.env.PORT || 5500;
const useHttpsEnv = process.env.HTTPS === 'true';
// If user generated cert.pem/key.pem (mkcert), prefer them automatically
const hasLocalCerts = fs.existsSync(__dirname + '/cert.pem') && fs.existsSync(__dirname + '/key.pem');
const useHttps = hasLocalCerts || useHttpsEnv;
const app = connect();

app.use(serveStatic(__dirname, {'index': ['index.html']}));

if(useHttps){
  // prefer local certs if present (mkcert), otherwise fall back to self-signed
  if(hasLocalCerts){
    const key = fs.readFileSync(__dirname + '/key.pem');
    const cert = fs.readFileSync(__dirname + '/cert.pem');
    const options = { key, cert };
    https.createServer(options, (req, res) => {
      app(req, res, finalhandler(req, res));
    }).listen(port, () => {
      console.log(`Server running at https://localhost:${port}/ (using cert.pem/key.pem)`);
    });
  } else {
    // lazy require selfsigned to avoid installing when not used
    const selfsigned = require('selfsigned');
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attrs, { days: 365 });
    const options = { key: pems.private, cert: pems.cert };
    https.createServer(options, (req, res) => {
      app(req, res, finalhandler(req, res));
    }).listen(port, () => {
      console.log(`Server running at https://localhost:${port}/ (self-signed)`);
    });
  }
} else {
  http.createServer((req, res) => {
    app(req, res, finalhandler(req, res));
  }).listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });
}
