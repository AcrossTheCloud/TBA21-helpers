const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const fs = require('fs');
const download = require('./common').download;
const upload = require('./common').upload;

const raw_conversion = async (file) => {
  const outputFile = file.substring(0,file.lastIndexOf('.'))+'.jpg';
  const { error, stdout, stderr } = await execFile('bin/dcraw',['-c','-q 0','-B 2 4','-w','-H 5',' -b 8',outputFile]);
  if (error) {
    console.log(error.code);
    console.log(stderr);
    console.log(stdout);
    return '';
  } else {
    return outputFile;
  }
}

module.exports.handler = async(event) => {

  if (event.srcKey.match(/\.raw$/) || event.srcKey.match(/\.cr2$/)) {

    let filename = await download(event.srcBucket, event.srcKey);
    console.log(filename);
    let outputFile = await raw_conversion(filename);
    console.log(outputFile);

    if (outputFile) {
      let put = await upload(outputFile,event.srcBucket);
      return put;
    } else {
      return '';
    }

  }

}
