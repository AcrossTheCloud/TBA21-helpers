const AWS = require('aws-sdk');

const rekognition = new AWS.Rekognition();
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {

  if (event.magic.match(/JPEG/) || event.magic.match(/PNG/)) {

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
    let requestData = {"key": event.srcKey, "labels": rekognitionData.Labels };

    let putParams = {
      TableName: process.env.IMAGE_TAG_TABLE,
      Item: requestData
    };

    let dynamoDBdata = await docClient.put(putParams).promise();
    console.log(dynamoDBdata);
  }
}
