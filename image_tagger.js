const AWS = require('aws-sdk');

const rekognition = new AWS.Rekognition();
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {

  if (event.magic.match(/jpeg/) || event.magic.match(/png/)) {

    let params = {
        Image: {
            S3Object: {
                Bucket: event.srcBucket,
                Name: event.decodedSrcKey
            }
        },
        MaxLabels: 10,
        MinConfidence: 60
    };

    let rekognitionData = await rekognition.detectLabels(params).promise();
    
    let requestData = {"key": event.decodedSrcKey, "labels": rekognitionData.Labels };

    let putParams = {
      TableName: process.env.IMAGE_TAG_TABLE,
      Item: requestData
    };

    let dynamoDBdata = await docClient.put(putParams).promise();
    console.log(dynamoDBdata);
  }
}
