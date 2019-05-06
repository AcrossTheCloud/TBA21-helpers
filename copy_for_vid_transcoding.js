const AWS = require('aws-sdk');
const s3 = new AWS.S3();

module.exports.handler = (event, context, callback) => {

    const params = {
     Bucket: process.env.TRANSCODE_BUCKET,
     CopySource: `/${event.srcBucket}/${event.decodedSrcKey}`,
     Key: event.decodedSrcKey
    };
    s3.copyObject(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     callback(data);           // successful response
    });

}
