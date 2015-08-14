#!/usr/bin/env node
'use strict';

var bodyParser = require('body-parser');
var bunyan = require('bunyan');
var express = require('express');
var superagent = require('superagent-promise')(require('superagent'), Promise);

// ignore errors for git's SSL certificate 
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var authHeader = process.env.AUTH_HEADER;
var log = bunyan.createLogger({ name: 'app' });
var app = express();
app.use(bodyParser.json());

log.info('Starting');

app.get('/',  function (req, res) {
  res.send('leeroy-pull-request-builder');
});

app.post('/event_handler', function (req, res) {
  var gitHubEvent = req.headers['x-github-event'];
  log.info('Received event: ' + gitHubEvent);
  if (gitHubEvent === 'ping') {
    res.status(204).send();
  } else if (gitHubEvent === 'pull_request') {
    process_pull_request(req.body.pull_request)
      .then(function() {
        res.status(204).send();
      }, function (e) {
        log.error(e);
        res.status(500).send();
      })
  } else {
    res.status(400).send();
  }
});

app.listen(3000);

function process_pull_request(pr) {
  return superagent
    .post('https://git/api/v3/repos/' + pr.base.repo.full_name + '/statuses/' + pr.head.sha)
    .set('Authorization', authHeader)
    .send({
      state: 'pending',
      description: 'Waiting for build to start',
      context: 'leeroy-pull-request-builder'
    })
    .then(function (res) {
      log.info('res.status = ' + res.status);
    });
}
