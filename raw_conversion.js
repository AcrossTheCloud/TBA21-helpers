process.env.PATH += ":/var/task/bin"
process.env.LD_LIBRARY_PATH += ":/var/task/lib"

const util = require('util');
const spawn = require('child_process').spawn;
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const fs = require('fs');
const download = require('./common').download;
const upload = require('./common').upload;

const raw_conversion = async (file) => {
  const outputFile = file.substring(0,file.lastIndexOf('.'))+'.jpg';


  let process = spawn('bin/dcraw', ['-c', '-q','0','-w','-H','5','-b','8',file,'| cjpeg -quality 80','>',outputFile,]);
  
  let end = new Promise(function (resolve, reject) {
    process.on('close', (code) => resolve(code));
    process.on('error', reject); // or something like that
  });
  let exitCode = await end;
  console.log(exitCode);

  return outputFile;
}

module.exports.handler = async(event) => {

  if (event.magic.match(/raw image/)) {

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
