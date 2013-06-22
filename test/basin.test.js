var basin = require('../lib/basin')
  , fs = require('fs-extra')
  , uuid = require('node-uuid')
  , P = require('autoresolve')
  , testutil = require('testutil')
  , path = require('path')
  , next = require('nextflow')
  , scrap = require('scrap')
  , S = require('string')
  , S3 = require('../lib/s3').S3
  , batch = require('batchflow')

var TEST_DIR = ''
var S3_AUTH = fs.readJSONFileSync(P('test/resources/s3.json'))

function genName () {
  return  'test-'+S(uuid.v1()).replaceAll('-', '')
}

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

describe('basin', function() {
  beforeEach(function(done) {
    TEST_DIR = testutil.createTestDir('basin')
    done()
  })

  after(function(done) {
    cleanUp(done)
  })

  describe('+ create()', function() {
    it('should generate a template/skeleton site', function(done) {
      var createDir = path.join(TEST_DIR, 'create')
      basin.create(createDir, function(err) {
        T (fs.existsSync(createDir))
        T (fs.existsSync(path.join(createDir, 'doc.html')))
        T (fs.existsSync(path.join(createDir, 'error.html')))
        T (fs.existsSync(path.join(createDir, 'index.html')))
        T (fs.existsSync(path.join(createDir, 'basin.conf.json')))
        T (fs.existsSync(path.join(createDir, 'somefolder', 'doc2.html')))
        done()
      })
    })
  })

  describe('+ deploy()', function() {
    it('should deploy the files to amazon s3', function(done) {
      var name = genName()
      var dir = path.join(TEST_DIR, 'deploy')
      basin.create(dir, function(err) {
        F (err)

        process.chdir(dir)
        var s3json = fs.readJsonSync('./basin.conf.json')
        s3json.secret = S3_AUTH.secret
        s3json.key = S3_AUTH.key
        s3json.bucket = name
        fs.writeJsonSync('./basin.conf.json', s3json)

        var url = 'http://' + name + '.s3-website-us-east-1.amazonaws.com';
        //console.log(url)

        basin.deploy(function(err) {
          if (err) return done(err)

          var flow;
          next(flow = {
            ERROR: function(err) {
              done(err)
            },
            checkIndex: function() {
              scrap(url + '/', function(err, $, code, html) {
                F (err)
                //console.dir(html)
                T (code === 200)
                T ($('title').text().trim() === 'Some Index')
                flow.next()
              })
            },
            checkError: function () {
              scrap(url + '/thisfiledoesnotexist.html', function(err, $, code, html) {
                T (err) //err from scrap if code isnt 200
                T (code !== 200)
                T (html.indexOf('Some Error') > 0)
                flow.next()
              })
            },
            checkDoc: function() {
              scrap(url + '/doc.html', function(err, $, code, html) {
                F (err) 
                T (code === 200)
                T ($('title').text().trim() === 'Some Document')
                flow.next()
              })
            },
            checkDoc2: function() {
              scrap(url + '/somefolder/doc2.html', function(err, $, code, html) {
                F (err) 
                T (code === 200)
                T ($('title').text().trim() === 'Some Document 2')
                flow.next()
              })
            },
            checkBasinConfNotUploaded: function() {
              scrap(url + '/basin.conf.json', function(err, $, code, html) {
                T (code !== 200)
                flow.next()
              })
            },
            checkBasinConfHasLastDeploy: function() {
              var conf = fs.readJsonSync('./basin.conf.json')
              T (conf.key)
              T (conf.lastDeployed)
              done()
            }
          })
        })
      })
    })
  })
})


