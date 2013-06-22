//wrapper module, will probably switch actual AWS sdk once it becomes more stable

var awssum = require('awssum')
  , amazon = awssum.load('amazon/amazon')
  , vendorS3 = awssum.load('amazon/s3').S3
  , batch = require('batchflow')

function S3 (params) {
  this.auth = {} //this obj can be used with most S3 apis
  this.auth.key = params.key || params.accessKeyId
  this.auth.secret = params.secret || params.secretAccessKey
  this.auth.accessKeyId = this.auth.key
  this.auth.secretAccessKey = this.auth.secret
  this.auth.region = params.region || 'us-east-1'
  this.auth.sslEnabled = true
}

S3.prototype.createBucket = function(bucketName, callback) {
  var s3 = new vendorS3(this.auth)

  s3.CreateBucket({BucketName: bucketName}, function(err, data) {
    if (err)
      if (err.Body && err.Body.Error)
        return callback(err.Body.Error)
      else 
        return callback(err)

    if (data.StatusCode === 200)
      callback(null)
    else
      callback(new Error('StatusCode: ' + data.StatusCode))
  })
}

S3.prototype.deleteBucket = function(bucketName, callback) {
  var s3 = new vendorS3(this.auth)

  s3.ListObjects({BucketName: bucketName}, function(err, resp) {
    if (!err && resp.Body.ListBucketResult.Contents) {
      batch(resp.Body.ListBucketResult.Contents).par(6)
      .each(function(i, item, next) {
        s3.DeleteObject({BucketName: bucketName, ObjectName: item.Key}, function(err, resp) {
          next()
        })
      })
      .end(function() {
        s3.DeleteBucket({BucketName: bucketName}, function(err, resp) {
          if (err)
            return callback(err.Body.Error)
          else
            return callback(null)
        })
      })
    } else { //try to delete just the bucket
      s3.DeleteBucket({BucketName: bucketName}, function(err, resp) {
        if (err)
          return callback(err.Body.Error)
        else
          return callback(null)
      })
    }
  })
}

S3.prototype.doesBucketExist = function(bucketName, callback) {
  var s3 = new vendorS3(this.auth)

  s3.CheckBucket({BucketName: bucketName}, function(resp) {
    if (resp.StatusCode === 200)
      callback(null, true)
    else if (resp.StatusCode === 404)
      callback(null, false)
    else
      callback(new Error('Not sure. Prob auth error. Status: ' + resp.StatusCode))
  })
}

S3.prototype.listBuckets = function(callback) {
  var s3 = new vendorS3(this.auth)

  s3.ListBuckets(function(err, resp) {
    if (err) return callback(err)
    else
      return callback(null, resp.Body.ListAllMyBucketsResult.Buckets.Bucket)
  })
}

S3.prototype.makeBucketWebsite = function(bucketName, params, callback) {
  var index = params.index || params.IndexDocument || 'index.html'
    , error = params.error || params.ErrorDocument || 'error.html'

  if (typeof params === 'function')
    callback = params

  var s3 = new vendorS3(this.auth)
  s3.PutBucketWebsite({BucketName: bucketName, IndexDocument: index, ErrorDocument: error}, function(err, resp) {
    if (err)
      if (err.Body && err.Body.Error)
        return callback(err.Body.Error)
      else
        return callback(new Error('Error, status code: ' + err.StatusCode))
    else
      callback(null)
  })
}

module.exports.S3 = S3
