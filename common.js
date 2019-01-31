const AWS = require('aws-sdk');
const fs = require('fs');
const s3 = new AWS.S3();

module.exports.download = async (srcBucket, srcKey, decodedSrcKey) => {

  let file = fs.createWriteStream('/tmp/'+decodedSrcKey, {encoding: null});
  let fd = s3.getObject({ Bucket: srcBucket, Key: decodedSrcKey }).createReadStream();
  fd.pipe(file);
  let end = new Promise(function(resolve, reject) {
    fd.on('end', ()=>resolve('/tmp/'+decodedSrcKey.replace(' ','_')));
    fd.on('error', reject); // or something like that
  });
  let filename = await end;
  return filename;
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
