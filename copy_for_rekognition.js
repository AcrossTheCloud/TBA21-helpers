const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = (event, context, callback) => {
  console.log("doing copy_for_rekognition");
  console.log(event);

  if (event.s3metadata.ContentType.toLowerCase().match(/(jpeg|png)/)) {
    console.log('copying');
    const params = {
      Bucket: process.env.REKOGNITION_BUCKET,
      CopySource: `/${event.srcBucket}/${event.decodedSrcKey}`,
      Key: event.decodedSrcKey
    };
    s3.copyObject(params, function (err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else {
        console.log(data);
        callback(data);   
      }        // successful response
    });
  }
}
