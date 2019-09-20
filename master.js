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
  let isWav = Boolean(
    data.ContentType.match(/audio\/(wave|wav|x-wav|x-pn-wav)/i) ||
    decodedSrcKey.match(/\.wav$/i)
  );
  let isRaw = Boolean(
    data.ContentType.match(/image\/(x-sony-arw|x-canon-cr2|x-canon-crw|x-kodak-dcr|x-adobe-dng|x-epson-erf|x-kodak-k25|x-minolta-mrw|x-nikon-nef|x-olympus-orf|x-pentax-pef|x-fuji-raf|x-panasonic-raw|x-sony-sr|x-sigma-x3f|x-dcraw)/i) ||
    decodedSrcKey.match(/\.raw$|\.dng$\.cr2$/i)
  ); // https://stackoverflow.com/questions/43473056/which-mime-type-should-be-used-for-a-raw-image

  const params = {
    stateMachineArn: process.env.stateMachineArn,
    input: JSON.stringify({srcBucket: srcBucket, srcKey: srcKey, decodedSrcKey: decodedSrcKey, s3metadata: data, isHEI,isImage,isJPEGPNG, isVideo, isWav, isRaw}),
    name: crypto.createHmac('sha256', srcKey + uuid()).digest('hex')
  }

  return stepfunctions.startExecution(params).promise().then(() => {
    callback(null, `Your statemachine ${process.env.stateMachineArn} executed successfully for job ${params.name}`);
  }).catch(error => {
    callback(error.message);
  });
};
