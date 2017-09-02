//-------------------------------------------------------------------
// http-peeper -- HTTP/HTTPS protocol peeper
//
// Copyright(c) 2017 sharkpp All rights reserved.
//
// The MIT License
// For the full copyright and license information, please view the LICENSE
// file that was distributed with this source code.
//-------------------------------------------------------------------

const https = require('https');
const http = require('http');
const dns = require('dns');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const tls = require('tls');
const execSync = require('child_process').execSync;

const port = 443;

const certDir = path.join(__dirname, 'cert');
try { fs.mkdirSync(certDir); } catch (e) {}

let requestId = 0;
let dnsCache = { localhost: '127.0.0.1' };
let secureContextCache = {};

https.createServer({
    SNICallback: (hostname, cb) => {
        console.log('SNICallback', hostname);
        if (secureContextCache[hostname]) {
            cb(null, secureContextCache[hostname]);
        }
        else {
            // load certificate
            let sslServerKey, sslServerCert;
            const sslServerKeyPath  = path.join(certDir, hostname + '-key.pem');
            const sslServerCertPath = path.join(certDir, hostname + '-cert.pem');
            try {
                sslServerKey  = fs.readFileSync(sslServerKeyPath);
                sslServerCert = fs.readFileSync(sslServerCertPath);
            }
            catch (e) {
                // generate certificate
                execSync('openssl genrsa -out ' + path.basename(sslServerKeyPath) + ' 2048', {
                    cwd: certDir,
                    stdio: [ 0, 0, 'inherit' ],
                });
                execSync('openssl req -batch -new -key ' + path.basename(sslServerKeyPath)
                        + ' -out ' + hostname + '-csr.pem'
                        + ' -subj "' + ['',
                                'C=JP',
                                'ST=Tokyo',
                                'L=' + hostname,
                                'O=' + hostname,
                                'OU=' + hostname,
                                'CN=' + hostname,
                            ].join('/') + '"', {
                    cwd: certDir,
                    stdio: [ 0, 0, 'inherit' ],
                });
                execSync('openssl x509 -in ' + hostname + '-csr.pem -out ' + path.basename(sslServerCertPath)
                        + ' -req -signkey ' + path.basename(sslServerKeyPath) + ' -days 73000 -sha256', {
                    cwd: certDir,
                    stdio: [ 0, 0, 'inherit' ],
                });
                // re: load certificate
                sslServerKey  = fs.readFileSync(sslServerKeyPath);
                sslServerCert = fs.readFileSync(sslServerCertPath);
            }
            const ctx = secureContextCache[hostname] = tls.createSecureContext({
                key:  sslServerKey,
                cert: sslServerCert,
            });
            cb(null, ctx);
        }
    }
}, (req, res) => {

    const reqId = (Array(4+1).join('0')+(++requestId).toString(36)).substr(-4);

    console.log('<' + reqId + '> ' + (new Date().toISOString()) + '| ' + Array(30+1).join('-'));

    const stepRequestDump = (ctx) => {
        return new Promise((resolve, reject) => {
            const prefix = '<' + ctx.id + '> ' + (new Date().toISOString()) + '| >> ';
            // dump method
            console.log(prefix + 'method: ' + req.method+' '+req.url+' HTTP/'+req.httpVersion);        
            // dump headers
            console.log(prefix + 'headers:');        
            for (let k in req.headers) {
                console.log(prefix + ' '+k+': '+req.headers[k]);        
            }
        
            if ('POST' !== req.method) {
                resolve(ctx);
            }
            else {
                let dataList = [], dataSize = 0;
                req.on('data', (chunk) => {
                    dataList.push(chunk);
                    dataSize += chunk.length;
                });
                req.on('end', () => {
                    const data = Buffer.concat(dataList, dataSize);
                    console.log(prefix + 'data:' + ' '+data.toString());
                    // next
                    resolve(Object.assign(ctx, {
                        postData: data
                    }));
                });
            }
        });
    };

    const stepResponseDump = (ctx) => {
        return new Promise((resolve, reject) => {
            const prefix = '<' + ctx.id + '> ' + (new Date().toISOString()) + '| << ';
            const res_ = ctx.response;
            // dump headers
            console.log(prefix + 'headers:');        
            for (let k in res_.headers) {
                console.log(prefix + ' '+k+': '+res_.headers[k]);        
            }
            if (undefined === res_.body) {
                resolve(ctx);
            }
            else {
                if ('gzip' !== res_.headers['content-encoding']) {
                    console.log(prefix + 'body:' + ' '+res_.body.toString());
                    resolve(ctx);
                }
                else {
                    zlib.unzip(res_.body, {
                        finishFlush: zlib.constants.Z_SYNC_FLUSH
                    }, (err, buffer) => {
                        if (!err) {
                            console.log(prefix + 'body:' + ' '+buffer.toString());
                        }
                        resolve(ctx);
                    });
                }
            }
        });
    };

    const stepSelectHost = (ctx) => {
        return new Promise((resolve, reject) => {
            // lookup host IP
            const host = req.headers.host;
            if (!host) {
                return reject(Object.assign(ctx, {
                    code: 502,
                    message: 'host header NOT present'
                }));
            }
            //
            if (dnsCache[host]) {
                resolve(Object.assign(ctx, {
                    ip: dnsCache[host]
                }));
            }
            else {
                dns.resolve4(host, (err, addresses) => {
                    if (err) {
                        return reject(Object.assign(ctx, {
                            code: 502,
                            message: 'host to ip resolve error',
                            detail: err.toString()
                        }));
                    }
                    const ipResolved = addresses[0];
                    dnsCache[host] = ipResolved;
                    resolve(Object.assign(ctx, {
                        ip: ipResolved
                    }));
                });
            }
        });
    };

    const stepProxy = (ctx) => {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: ctx.ip,
                port: port,
                path: req.url,
                method: req.method,
                headers: req.headers
            };
            const proxyReq = https.request(options, (proxyRes) => {
                ctx.response = {
                    statusCode: proxyRes.statusCode,
                    headers: proxyRes.headers,
                };
                let dataList = [], dataSize = 0;
                proxyRes.on('data', (chunk) => {
                    dataList.push(chunk);
                    dataSize += chunk.length;
                });
                proxyRes.on('end', () => {
                    ctx.response.body = Buffer.concat(dataList, dataSize);
                    resolve(ctx);
                });
            });
            proxyReq.on('error', (err) => {
                return reject(Object.assign(ctx, {
                    code: 502,
                    message: err.message,
                    detail: err.toString()
                }));
            });
            undefined !== ctx.postData && proxyReq.write(ctx.postData);
            proxyReq.end();
        });
    };

    const finish = (ctx) => {
        res.writeHead(ctx.response.statusCode, ctx.response.headers);
        res.end(ctx.response.body);
    };

    const failure = (ctx) => {console.log(ctx);
        const message = ctx.err || {
            code: 500,
            message: ctx.toString(),
        };
        req.writeHead(message.code, { 'Content-Type': 'application/json' });
        req.end(JSON.stringify(message));
    };

    Promise.resolve({
        id: reqId,
        response: {},
    })
    .then(stepRequestDump)
    .then(stepSelectHost)
    .then(stepProxy)
    .then(stepResponseDump)
    .then(finish)
    .catch(failure) 

}).listen(port);
