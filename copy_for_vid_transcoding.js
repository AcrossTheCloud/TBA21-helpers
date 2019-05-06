const AWS = require('aws-sdk');
const s3 = new AWS.S3();

module.exports.handler = (event, context, callback) => {
  
   console.log('Doing copy_for_vid_transcoding ...');

    const params = {
     Bucket: process.env.TRANSCODE_BUCKET,
     CopySource: `/${event.srcBucket}/${event.srcKey}`,
     Key: event.decodedSrcKey
    };

    console.log(params);
    s3.copyObject(params, function(err, data) {
      if (err) {
        console.log(err, err.stack);
        callback(err);
        } // an error occurred
      else 
         callback(null,data);           // successful response
    });

}
