var P = require('autoresolve')
  , fs = require('fs-extra')
  , path = require('path-extra')
  , walker = require('walker')
  , S3 = require(P('lib/s3')).S3
  , knox = require('knox')        //https://github.com/LearnBoost/knox
  , S3Uploader = require('s3')    //https://github.com/superjoe30/node-s3-client
  , TriggerFlow = require('triggerflow').TriggerFlow
  , qflow = require('qflow')
  , util = require('util')
  , mm = require('mime-magic')
  , mime = require('mime')

var UPLOAD_LIMIT = 32

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

  var url = 'http://%s.s3-website-%s.amazonaws.com';
  var baseTmpDir = path.join(path.tempdir(), 'basin-upload')
  var tmpDir = path.join(baseTmpDir, Date.now().toString())
  var confFile = path.join(dir,'basin.conf.json')
  var basinConfig = {} //need to refactor


  var doneTrigger = TriggerFlow.create({qDone: false, walkerDone: false}, function() {
    fs.remove(baseTmpDir, function(err) {
      basinConfig.lastDeployed = (new Date()).toISOString()
      fs.writeJson(confFile, basinConfig, function(err) {
        callback(err, url)
      })  
    })
  })

  fs.readJSONFile(confFile, function(err, basinConf) {
    if (err) return callback(err)
    basinConfig = basinConf //this should be refactored

    var region = basinConf.region || 'us-east-1'
    var lastDeployed = basinConf.lastDeployed || (new Date(0)).toISOString()
    url = util.format(url, basinConf.bucket, region)

    //console.dir(basinConf)
    var s3 = new S3(basinConf)
      , knoxClient = knox.createClient(basinConf)
      , uploader = S3Uploader.fromKnox(knoxClient)

    var q = qflow()
    .deq(function(val, next) {
      var ext = path.extname(val.src)
      var headers = {
        'x-amz-acl': 'public-read',
        'Content-Type': mime.lookup(ext)
      }

      console.log('Uploading %s...', val.src)
      if (!ext) { //file does not have an extension
        mm(val.src, function(err, type) {
          if (err) console.error(err)
          headers['Content-Type'] = type
          uploader.upload(val.src, val.dest, headers).on('end', function(err) {
            //a bit hacky, but urls like mysite.com/contemporary-slavery/ redirects to mysite.com/contemporary-slavery
            //good for Wordpress URL compatiblity
            var file = path.join(tmpDir, val.src + '/', basinConf.site.index)
            fs.createFile(file, function(err) {
              delete headers['Content-Type']
              //console.log('DEST: ' + val.dest)
              headers['x-amz-website-redirect-location'] = '/'+ val.dest
              uploader.upload(file, val.dest + '/' + basinConf.site.index, headers).on('end', next)
            })

          })
        })
      } else 
        uploader.upload(val.src, val.dest, headers).on('end', next)    
    })
    .on('error', function(err) {
      console.error(err) 
    })
    .on('empty', function() {
      doneTrigger.update({qDone: true})
    })
    .start(UPLOAD_LIMIT)

    s3.createBucket(basinConf.bucket, function(err) {
      if (err) return callback(err)
      s3.makeBucketWebsite(basinConf.bucket, basinConf.site, function(err) {
        if (err) return callback(err)

         walker(dir)
        .on('file', function(file, stat) {
          if (path.basename(file) === 'basin.conf.json') return; //skip basin.conf.json

          if ((new Date(stat.mtime)).toISOString() >= lastDeployed) {
            var destFile = file.replace(dir + '/', '')
            doneTrigger.update({qDone: false})
            q.enq({src: file, dest: destFile})
          }
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

