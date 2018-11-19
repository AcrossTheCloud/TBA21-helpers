const AWS = require('aws-sdk');
const uuid = require('uuid/v1');
const download = require('./common').download;

const stepfunctions = new AWS.StepFunctions();

module.exports.start = (event, context, callback) => {
  const s3Record = event.Records[0].s3;
  const srcBucket = s3Record.bucket.name;
  const srcKey = decodeURIComponent(s3Record.object.key.replace(/\+/g, " "));

  let filename = await download(srcBucket, srcKey);

  const { error, stdout, stderr } = await execFile('file', [filename]);
  if (error) {
    console.log(error.code);
    console.log(stderr);
    console.log(stdout);
    return '';
  } 

  const params = {
    stateMachineArn: process.env.stateMachineArn,
    input: JSON.stringify({srcBucket: srcBucket, srcKey: srcKey, magic: stdout}),
    name: srcKey+uuid()
  }

  return stepfunctions.startExecution(params).promise().then(() => {
    callback(null, `Your statemachine ${process.env.stateMachineArn} executed successfully for job ${params.name}`);
  }).catch(error => {
    callback(error.message);
  });
};
