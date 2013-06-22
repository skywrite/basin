Node.js - basin
================

[![build status](https://secure.travis-ci.org/jprichardson/basin.png)](http://travis-ci.org/jprichardson/basin)

Deploy sites to Amazon S3


Why?
----

Sometimes you want a simple, cheap, no-fuss way to deploy a static site. Amazon S3 is a decent solution for this.



Installation
------------

    npm install [-g] basin



API
---

### create(dir, callback)

Generates a skeleton sample site at `dir`, including `basin.conf.json`.

```javascript
var basin = require('basin')

basin.create('/tmp/basin-test', function(err) {
  //generates a skeleton example site
})
```

### deploy([dir], callback)

Deploys `dir` to S3. Configures all objects and bucket for web access. If `dir` is not specified, then present working
directory is used. The directory must contain `basin.conf.json`.

```js
basin.deploy(function(err, url) {
 console.log(url); // 'http://MY-BUCKET-NAME.s3-website-us-east-1.amazonaws.com';
})
```


Configuration (basin.conf.json)
-------------
- **key**: required, the S3 key. Can be found on the AWS Web Console.
- **secret**: required, the S3 secret. Can be found on the AWS Web Console.
- **bucket**: required, the name of the bucket.
- **region**: defaults to `us-east-1`.
- **site.index**: defaults to `index.html`.
- **site.error**: defaults to `error.html`.

```json
{
  "key": "",
  "secret": "",
  "bucket": "",
  "region": "us-east-1",
  "site": {
    "index": "index.html",
    "error": "error.html"
  }
}
```


Command Line Interface
----------------------
    
    Usage: basin [options]

    Options:

      -h, --help       output usage information
      -V, --version    output the version number
      --create [dir]   Creates a skeleton site at the destination directory.
      --deploy         Deploys/publishes the current directory and sub directories. Must have basin.conf.json file present.
      --remote-delete  Deletes the remote S3 bucket. Must have basin.conf.json file present in current directory.



License
-------

(MIT License)

Copyright 2012-2013, JP Richardson  <jprichardson@gmail.com>


