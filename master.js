const AWS = require('aws-sdk');
const uuid = require('uuid/v1');
const crypto = require('crypto');
const s3 = new AWS.S3();

const stepfunctions = new AWS.StepFunctions();

module.exports.start = async (event, context, callback) => {
  const s3Record = event.Records[0].s3;
  const srcBucket = s3Record.bucket.name;
  const srcKey = s3Record.object.key; 
  const decodedSrcKey = decodeURIComponent(srcKey.replace(/\+/g, " "));


  let data = await s3.headObject({ Bucket: srcBucket, Key: decodedSrcKey }).promise();
  console.log(data);
  let isHEI=Boolean(decodedSrcKey.toLowerCase().match(/\.hei[cf]$/));
  let isImage= Boolean(data.ContentType.toLowerCase().match(/image/) || isHEI);
  let isJPEGPNG = Boolean(decodedSrcKey.toLowerCase().match(/(\.png|\.jpg|\.jpeg)$/));
  let isVideo = Boolean(data.ContentType.toLowerCase().match(/video/));
  let isWav = Boolean(decodedSrcKey.match(/\.wav$/i));

  const params = {
    stateMachineArn: process.env.stateMachineArn,
    input: JSON.stringify({srcBucket: srcBucket, srcKey: srcKey, decodedSrcKey: decodedSrcKey, s3metadata: data, isHEI,isImage,isJPEGPNG, isVideo, isWav}),
    name: crypto.createHmac('sha256', srcKey + uuid()).digest('hex')
  }

  return stepfunctions.startExecution(params).promise().then(() => {
    callback(null, `Your statemachine ${process.env.stateMachineArn} executed successfully for job ${params.name}`);
  }).catch(error => {
    callback(error.message);
  });
};
