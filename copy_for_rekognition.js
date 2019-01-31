const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event) => {

  if (event.magic.match(/jpeg/) || event.magic.match(/png/)) {
    const params = {
      Bucket: process.env.REKOGNITION_BUCKET,
      CopySource: `/${event.srcBucket}/${event.srcKey}`,
      Key: event.srcKey
    };
    s3.copyObject(params, function (err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else callback(data);           // successful response
    });
  }
}
