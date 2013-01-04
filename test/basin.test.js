var basin = require('../lib/basin')
  , fs = require('fs-extra')
  , uuid = require('node-uuid')

var BUCKET_NAME = ''

describe('basin', function() {
  beforeEach(function(done) {
    BUCKET_NAME = uuid.v1()
  })
})