const AWS = require('aws-sdk');
const fs = require('fs');
const download = require('./common').download;
const util = require('util');
const imageHash = util.promisify(require('image-hash'));
const crypto = require('crypto');
const docClient = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async(event) => {

  let filename = await download(event.srcBucket, event.srcKey, event.decodedSrcKey);


  let hashes = {};

  function checksumFile(hashName, path) {
    return new Promise((resolve, reject) => {
      let hash = crypto.createHash(hashName);
      let stream = fs.createReadStream(path);
      stream.on('error', err => reject(err));
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  hashes.key = event.decodedSrcKey;

  hashes.sha512 = await checksumFile('sha512',filename);
  hashes.md5 = await checksumFile('md5',filename);


  if (event.srcKey.toLowerCase().endsWith('.png') || event.srcKey.toLowerCase().endsWith('.jpg') || event.srcKey.toLowerCase().endsWith('.jpeg')) {

    hashes.imageHash = await imageHash(filename, 16, true);

  }

  let putParams = {
    TableName: process.env.HASHES_TABLE,
    Item: hashes
  };
  let data = await docClient.put(putParams).promise();
  console.log(data);

}
