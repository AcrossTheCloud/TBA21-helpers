const AWS = require('aws-sdk');

const stepfunctions = new AWS.StepFunctions();

module.exports.start = (event, context, callback) => {
  const s3Record = event.Records[0].s3;
  const srcBucket = s3Record.bucket.name;
  const srcKey = decodeURIComponent(s3Record.object.key.replace(/\+/g, " "));

  const params = {
    stateMachineArn: process.env.stateMachineArn,
    input: JSON.stringify({srcBucket: srcBucket, srcKey: srcKey}),
    name: srcKey
  }

  return stepfunctions.startExecution(params).promise().then(() => {
    callback(null, `Your statemachine ${process.env.stateMachineArn} executed successfully for job ${params.name}`);
  }).catch(error => {
    callback(error.message);
  });
};
