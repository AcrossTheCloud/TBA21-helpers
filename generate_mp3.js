const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const fs = require('fs');

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

const download = async (srcBucket, srcKey) => {
  const s3 = new AWS.S3();
  let params = {Bucket: srcBucket, Key: srcKey};
  let file = require('fs').createWriteStream('/tmp/'+srcKey);
  let fd = s3.getObject(params).createReadStream();
  fd.pipe(file);
  let end = new Promise(function(resolve, reject) {
    fd.on('end', ()=>resolve('/tmp/'+srcKey));
    fd.on('error', reject); // or something like that
  });
  let filename = await end;
  return filename;
}

const upload = async (filename, bucket) => {

  let stream = fs.createReadStream(filename);
  let put = await s3.putObject({Bucket: bucket, Key: filename.substring(5), Body: stream}).promise();
  return put;

}

module.exports.handler = async(event) => {

  if (event.srcKey.match(/\.mp.*/) || event.srcKey.match(/\.m4a/)) {

    let filename = await download(event.srcBucket, event.srcKey);
    console.log(filename);
    let outputFile = await generateMP3(filename);
    console.log(outputFile);

    if (outputFile) {
      let put = await upload(outputFile,event.srcBucket);
      return put;
    } else {
      return '';
    }

  }

}
