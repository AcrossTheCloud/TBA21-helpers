const AWS = require('aws-sdk');

const rekognition = new AWS.Rekognition();
// const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {

  if (event.srcKey.toLowerCase().endsWith('.png') || event.srcKey.toLowerCase().endsWith('.jpg') || event.srcKey.toLowerCase().endsWith('.jpeg')) {

    let params = {
        Image: {
            S3Object: {
                Bucket: event.srcBucket,
                Name: event.srcKey
            }
        },
        MaxLabels: 10,
        MinConfidence: 60
    };

    let rekognitionData = await rekognition.detectLabels(params).promise();
    let requestData = {"key": srcKey, "labels": rekognitionData.Labels };

    let putParams = {
      TableName: process.env.IMAGE_TAG_TABLE,
      Item: requestData
    };

    //AWS.config.update({region: 'eu-central-1'});
    let docClient = new AWS.DynamoDB.DocumentClient();
    let dynamoDBdata = await docClient.put(putParams).promise();
    console.log(dynamoDBdata);
  }
}
