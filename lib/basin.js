var P = require('autoresolve')
  , fs = require('fs-extra')
  , path = require('path')
  , walker = require('walker')
  , S3 = require(P('lib/s3')).S3
  , knox = require('knox')        //https://github.com/LearnBoost/knox
  , S3Uploader = require('s3')    //https://github.com/superjoe30/node-s3-client
  , TriggerFlow = require('triggerflow').TriggerFlow
  , qflow = require('qflow')

function create (dest, callback) {
  fs.copy(P('resources/skeleton'), dest, function(err) {
    callback(err)
  })
}

function deploy (dir, callback) {
  if (typeof dir === 'function') {
    callback = dir
    dir = process.cwd()
  }

  var doneTrigger = TriggerFlow.create({qDone: false, walkerDone: false}, function() {
    callback(null)
  })

  fs.readJSONFile(path.join(dir,'basin.conf.json'), function(err, basinConf) {
    if (err) return callback(err)

    //console.dir(basinConf)
    var s3 = new S3(basinConf)
      , knoxClient = knox.createClient(basinConf)
      , uploader = S3Uploader.fromKnox(knoxClient)

    var q = qflow()
    .deq(function(val, next) {
      uploader.upload(val.src, val.dest, { 'x-amz-acl': 'public-read' }).on('end', next)
    })
    .on('error', function(err) {
      console.error(err) 
    })
    .on('empty', function() {
      doneTrigger.update({qDone: true})
    })
    .start(4)

    s3.createBucket(basinConf.bucket, function(err) {
      if (err) return callback(err)
      s3.makeBucketWebsite(basinConf.bucket, basinConf.site, function(err) {
        if (err) return callback(err)

         walker(dir)
        .on('file', function(file, stat) {
          if (path.basename(file) === 'basin.conf.json') return; //skip basin.conf.json
          var destFile = file.replace(dir + '/', '')
          doneTrigger.update({qDone: false})
          q.enq({src: file, dest: destFile})
        })
        .on('end', function() {
          doneTrigger.update({walkerDone: true})
        })
      })
    })
  })

  
}

module.exports.create = create
module.exports.deploy = deploy

