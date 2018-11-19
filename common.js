const AWS = require('aws-sdk');

module.exports.download = async (srcBucket, srcKey) => {
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

module.exports.delete_empty_strings = (inputObject) => {
  for (let i in inputObject) {
    if (inputObject[i] === '') {
      delete inputObject[i];
    } else if (typeof inputObject[i] === 'object') {
      module.exports.delete_empty_strings(inputObject[i]);
    }
  }
}


module.exports.upload = async (filename, bucket) => {

  let stream = fs.createReadStream(filename);
  let put = await s3.putObject({Bucket: bucket, Key: filename.substring(5), Body: stream}).promise();
  return put;

}
