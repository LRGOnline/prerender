#!/usr/bin/env node
var prerender = require('./lib');

var server = prerender({
  port: process.env.PRERENDER_PORT || 3000,
  enableServiceWorker: true,
  softIterations: 30,
  pageDoneCheckInterval: 100,
  waitAfterLastRequest: 500,
  pageLoadTimeout: 40000,
  logRequests: true,
  captureConsoleLog: true,
  logger: true,
});

// server.use(require('prerender-memory-cache'));
server.use(prerender.prerenderCacheFileSystem());

server.use(prerender.browserForceRestart());

server.use(prerender.blockResources());
server.use(prerender.sendPrerenderHeader());
server.use(prerender.removeScriptTags());
server.use(prerender.httpHeaders());

server.start();
