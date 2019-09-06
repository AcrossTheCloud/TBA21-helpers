const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const download = require('./common').download;
const upload = require('./common').upload;

const generateM4A = async (file) => {
  const outputFile = file.substring(0,file.lastIndexOf('.'))+'.m4a';
  const { error, stdout, stderr } = await execFile('bin/ffmpeg',['-i', file, '-c:a', 'libfdk_aac', '-b:a', '128k', outputFile]);
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

    let filename = await download(event.srcBucket, event.srcKey, event.decodedSrcKey);
    let uploadKey = event.decodedSrcKey.substring(0, event.decodedSrcKey.lastIndexOf('.')) + '.m4a';
    console.log(filename);
    let outputFile = await generateM4A(filename);
    console.log(outputFile);

    if (outputFile) {
      let put = await upload(outputFile,uploadKey,process.env.M4A_BUCKET);
      return put;
    } else {
      return '';
    }

}
