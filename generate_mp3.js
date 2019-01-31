const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const fs = require('fs');
const download = require('./common').download;
const upload = require('./common').upload;

const generateMP3 = async (file) => {
  const outputFile = file.substring(0,file.lastIndexOf('.'))+'_Alexa_audio.mp3';
  const { error, stdout, stderr } = await execFile('bin/ffmpeg',['-i',file,'-ac', '2', '-codec:a','libmp3lame','-b:a','48k','-ar','16000',outputFile]);
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

  if (event.srcKey.match(/\.mp.*/) || event.srcKey.match(/\.m4a/) || event.srcKey.match(/\.mp3/)) {

    let filename = await download(event.srcBucket, event.srcKey, event.decodedSrcKey);
    let uploadKey = event.decodedSrcKey.substring(0, event.decodedSrcKey.lastIndexOf('.')) + '_Alexa_audio.mp3';
    console.log(filename);
    let outputFile = await generateMP3(filename);
    console.log(outputFile);

    if (outputFile) {
      let put = await upload(outputFile,uploadKey,process.env.ALEXA_AUDIO_BUCKET);
      return put;
    } else {
      return '';
    }

  }

}
