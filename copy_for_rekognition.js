const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = (event, context, callback) => {
  console.log("doing copy_for_rekognition");
  console.log(event);

    const params = {
      Bucket: process.env.REKOGNITION_BUCKET,
      CopySource: (event.isHEI ? `/${event.convertHEIresult.convertedBucket}/${event.convertHEIresult.convertedKey}` : `/${event.srcBucket}/${event.srcKey}`) ,
      Key: (event.isHEI ? event.convertHEIresult.convertedKey : event.decodedSrcKey)
    };
    s3.copyObject(params, function (err, data) {
      if (err) {
        callback(err);
        console.log(err, err.stack); // an error occurred
      }
      else {
        console.log(data);
        callback(null, {rekognitionBucket: params.Bucket , rekognitionKey: params.Key });   
      }        // successful response
    });


}
