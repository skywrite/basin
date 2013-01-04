var testutil = require('testutil')
  , S3 = require('../lib/S3').S3
  , fs = require('fs-extra')
  , uuid = require('node-uuid')
  , P = require('autoresolve')
  , S = require('string')
  , batch = require('batchflow')

var S3_AUTH = fs.readJSONFileSync(P('test/resources/s3.json'))

function cleanUp(done) {
  var s3 = new S3(S3_AUTH)
  s3.listBuckets(function(err, buckets) {
    batch(buckets).par(8)
    .each(function(i, item, next) {
      if (S(item.Name).startsWith('test-'))
        s3.deleteBucket(item.Name, next)
      else
        next()
    })
    .end(function() {
      done()
    })
  })
}

function genName () {
  return  'test-'+S(uuid.v1()).replaceAll('-', '')
}

describe('S3', function() {
  after(function(done) {
    cleanUp(done)
  })

  describe('- createBucket()', function() {
    it('should return null when successful', function(done) {
      var s3 = new S3(S3_AUTH)      
      s3.createBucket(genName(), function(err) {
        F (err)
        done()
      })
    })
  })

  describe('- deleteBucket()', function() {
    it('should return null when successful', function(done) {
      var name = genName()
      var s3 = new S3(S3_AUTH)
      s3.createBucket(name, function(err) {
        F (err)
        s3.deleteBucket(name, function(err) {
          F (err)
          done()
        })
      })
    })

    it('should return error when bucket does not exist', function(done) {
      var name = genName()
      var s3 = new S3(S3_AUTH)
      s3.deleteBucket(name, function(err) {
        T (err)
        done()
      })
    })
  })

  describe('- doesBucketExist()', function() {
    it('should return true when the bucket does exist', function(done) {
      var name = genName()

      var s3 = new S3(S3_AUTH)
      s3.createBucket(name, function(err) {
        F (err)
        s3.doesBucketExist(name, function(err, itDoes) {
          T (itDoes)
          F (err)
          done()
        })
      })
    })

    it('should return false when the bucket does not exist', function(done) {
      var name = genName()

      var s3 = new S3(S3_AUTH)
      s3.doesBucketExist(name, function(err, itDoes) {
        F (itDoes)
        F (err)
        done()
      })
    })
  })

  describe('- listBuckets()', function() {
    it('should list all of the buckets', function(done) {
      var s3 = new S3(S3_AUTH)
      s3.listBuckets(function(err, buckets) {
        F (err)
        T (typeof buckets.length === 'number')
        done()
      })
    })
  })

  describe('- makeBucketWebsite', function() {
    it('should make a bucket a website bucket and return null if successful', function(done) {
      var name = genName()

      var s3 = new S3(S3_AUTH)
      s3.createBucket(name, function(err) {
        F (err)
        s3.makeBucketWebsite(name, function(err) {
          F (err)
          done()
        })
      })
    })

    it('should return an error if the bucket does not exist', function(done) {
      var name = genName()

      var s3 = new S3(S3_AUTH)
      s3.makeBucketWebsite(name, function(err) {
        T (err)
        done()
      })
    })
  })
})

