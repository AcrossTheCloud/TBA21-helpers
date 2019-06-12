process.env.PATH += ":/var/task/bin"
process.env.LD_LIBRARY_PATH += ":/var/task/lib"

const util = require('util');
const spawn = require('child_process').spawn;
const fs = require('fs');
const download = require('./common').download;
const upload = require('./common').upload;
const execFile = util.promisify(require('child_process').execFile);


module.exports.handler = async(event,context,callback) => {

  console.log('doing convertHEI');
  console.log(event);

  try {

    if (event.s3metadata.ContentLength > 500000000)
     console.log(`WARNING: the file size for ${event.decodedSrcKey} is over 500mb, this operation might fail.`);


    let filename = await download(event.srcBucket, event.srcKey, event.decodedSrcKey);
    console.log(filename);
    let outputFile = filename.substring(0, filename.lastIndexOf('.')) + '.jpg';
    console.log(outputFile);

    const { error, stdout, stderr } = await execFile('/var/task/bin/tifig-static-0.2.2/tifig', ['-v','-p',filename,outputFile]);
    if (error) {
      console.log(error.code);
      console.log(stderr);
      console.log(stdout);
      throw new Error(error);
    }




      let uploadKey = event.srcKey.substring(0, event.srcKey.lastIndexOf('.')) + '.jpg';
      let put = await upload(outputFile, uploadKey, process.env.CONVERSION_BUCKET);
      console.log(put);
      callback(null,{convertedBucket: process.env.CONVERSION_BUCKET, convertedKey:uploadKey });


    
  } catch (err) {
    console.log(err);
    callback(err);
  }

}
