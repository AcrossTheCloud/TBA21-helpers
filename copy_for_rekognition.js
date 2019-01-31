const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event) => {
  console.log(event.magic);

  if (event.magic.match(/jpeg/) || event.magic.match(/png/)) {
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
