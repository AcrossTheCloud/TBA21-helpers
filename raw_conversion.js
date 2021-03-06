process.env.PATH += ":" + process.env.LAMBDA_TASK_ROOT + "/bin"
process.env.LD_LIBRARY_PATH += ":" + process.env.LAMBDA_TASK_ROOT + "/lib"

const spawn = require('child_process').spawn;
const fs = require('fs');
const download = require('./common').download;
const upload = require('./common').upload;

const raw_conversion = async (file) => {
  const outputFile = file.substring(0, file.lastIndexOf('.')) + '.jpg';

  let end = new Promise(function (resolve, reject) {
    spawn('bin/dcraw', ['-c', '-q', '3', '-w', '-H', '5', file,]).stdout.pipe(
      spawn('bin/cjpeg').stdout.pipe(
        fs.createWriteStream(outputFile, { encoding: null }).on('finish', () => resolve('done'))));
  });
  let finishedWriting = await end;
  console.log(finishedWriting);

  return outputFile;
}

module.exports.handler = async (event, context) => {

  console.log('doing raw_conversion');
  console.log(event);

  try {

    if (event.s3metadata.ContentLength > 500000000) {
      console.log(`ERROR: the file size for ${event.decodedSrcKey} is over 500mb, this operation might fail.`);
      return ({ success: false });
    }

    let filename = await download(event.srcBucket, event.srcKey, event.decodedSrcKey);

    let outputFile = await raw_conversion(filename);
    console.log(outputFile);
    let uploadKey = event.decodedSrcKey.substring(0, event.decodedSrcKey.lastIndexOf('.')) + '.jpg';

    if (outputFile) {
      console.log('trace' + outputFile)
      let put = await upload(outputFile, uploadKey, process.env.CONVERTED_IMAGE_BUCKET);
      console.log(put.toString());
      return put;
    } else {
      return ({ success: false });
    }

  } catch (err) {
    console.log(err);
    return ({ success: false });
  }

}
