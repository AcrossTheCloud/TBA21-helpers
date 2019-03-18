const AWS = require('aws-sdk');
const uuid = require('uuid/v1');
const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const download = require('./common').download;
const crypto = require('crypto');
const s3 = new AWS.S3();

const stepfunctions = new AWS.StepFunctions();

module.exports.start = async (event, context, callback) => {
  const s3Record = event.Records[0].s3;
  const srcBucket = s3Record.bucket.name;
  const srcKey = s3Record.object.key; 
  const decodedSrcKey = decodeURIComponent(s3Record.object.key.replace(/\+/g, " "));

  // let filename = await download(srcBucket, srcKey, decodedSrcKey);

  // const { error, stdout, stderr } = await execFile('file', [filename]);
  // if (error) {
  //   console.log(error.code);
  //   console.log(stderr);
  //   console.log(stdout);
  //   return '';
  // } 

  let data = await s3.headObject({ Bucket: srcBucket, Key: decodedSrcKey });
  console.log(data);

  const params = {
    stateMachineArn: process.env.stateMachineArn,
    input: JSON.stringify({srcBucket: srcBucket, srcKey: srcKey, decodedSrcKey: decodedSrcKey, magic: stdout.toLowerCase()}),
    name: crypto.createHmac('sha256', srcKey + uuid()).digest('hex')
  }

  // return stepfunctions.startExecution(params).promise().then(() => {
  //   callback(null, `Your statemachine ${process.env.stateMachineArn} executed successfully for job ${params.name}`);
  // }).catch(error => {
  //   callback(error.message);
  // });
};
