process.env.PATH += ":"+process.env.LAMBDA_TASK_ROOT+"/bin"
process.env.LD_LIBRARY_PATH += ":"+process.env.LAMBDA_TASK_ROOT+"/lib"

const util = require('util');
const download = require('./common').download;
const upload = require('./common').upload;
const execFile = util.promisify(require('child_process').execFile);


module.exports.handler = async(event,context) => {

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
      return ({convertedBucket: process.env.CONVERSION_BUCKET, convertedKey:uploadKey });


    
  } catch (err) {
    console.log(err);
    throw new Error(err.message); // does need to fail as subsequent steps depend on it 
  }

}
