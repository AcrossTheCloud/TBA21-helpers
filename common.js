const AWS = require('aws-sdk');
const fs = require('fs');
const s3 = new AWS.S3();
const util = require('util');
const readdir = util.promisify(fs.readdir);
const unlink = util.promisify(fs.unlink);

cleanTmpDir = async () => {
  const directory = '/tmp';
  try {
    const files = await readdir(directory);
    const unlinkPromises = files.map(filename => unlink(`${directory}/${filename}`));
    return Promise.all(unlinkPromises);
  } catch (err) {
    console.log(err);
  }

}

module.exports.download = async (srcBucket, srcKey, decodedSrcKey) => {
  await cleanTmpDir();
  console.log('Cleaned /tmp folder.');
  
  let filename = srcKey;
  if (filename.match(/\//)) {
    filename = filename.substring(filename.lastIndexOf('/')+1);
  } 

  let file = fs.createWriteStream('/tmp/'+filename, {encoding: null});
  let fd = s3.getObject({ Bucket: srcBucket, Key: decodedSrcKey }).createReadStream();
  fd.pipe(file);
  let end = new Promise(function(resolve, reject) {
    fd.on('end', ()=>resolve('done'));
    fd.on('error', reject); // or something like that
  });
  let done = await end;
  console.log(done);
  return '/tmp/'+filename;
}

module.exports.delete_empty_strings = (inputObject) => {
  for (let i in inputObject) {
    if (inputObject[i] === '') {
      delete inputObject[i];
    } else if (typeof inputObject[i] === 'object') {
      module.exports.delete_empty_strings(inputObject[i]);
    }
  }
}


module.exports.upload = async (filename, key, bucket) => {

  let stream = fs.createReadStream(filename);
  let put = await s3.putObject({Bucket: bucket, Key: key, Body: stream}).promise();
  return put;

}



