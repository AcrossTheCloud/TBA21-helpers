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
  
  let end = new Promise(function (resolve, reject) {
    spawn('bin/dcraw', ['-c', '-q', '3', '-w', '-H', '5', file,]).stdout.pipe(
      spawn('bin/cjpeg').stdout.pipe(
        fs.createWriteStream(outputFile, { encoding: null }).on('finish', () => resolve('done'))));
  });
  let finishedWriting = await end;
  console.log(finishedWriting);

  return outputFile;
}

module.exports.handler = async(event) => {

  if (event.magic.match(/raw image/)) {

    let filename = await download(event.srcBucket, event.srcKey, event.decodedSrcKey);
    console.log(filename);
    let outputFile = await raw_conversion(filename);
    console.log(outputFile);
    let uploadKey = event.decodedSrcKey.substring(0, event.decodedSrcKey.lastIndexOf('.')) + '.jpg';

    if (outputFile) {
      let put = await upload(outputFile,uploadKey,event.srcBucket);
      return put;
    } else {
      return '';
    }

  }

}
