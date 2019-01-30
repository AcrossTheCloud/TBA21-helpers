process.env.PATH += ':/var/task/bin'; // add our bin folder to path
const exifDB = require('exiftool-json-db');
const download = require('./common').download;
const delete_empty_strings = require('./common').delete_empty_strings;

const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {

  if (event.magic.match(/image/) || event.srcKey.toLowerString().match(/\.hei[cf]$/)) {
    
    let filename = await download(event.srcBucket, event.srcKey, event.decodedSrcKey);
    const emitter = exifDB.create({
      media: '/tmp',
      database: '/tmp/exif.json'
    });

    let end = new Promise(function (resolve, reject) {
      emitter.on('done', () => resolve(require('/tmp/exif.json')));
      emitter.on('error', reject); // or something like that
    });

    let exif = await end;
    delete_empty_strings(exif);

    let putParams = {
      TableName: process.env.IMAGE_EXIF_TABLE,
      Item: {"key": event.decodedSrcKey, "exif": exif}
    };

    let dynamoDBdata = await docClient.put(putParams).promise();
    console.log(dynamoDBdata);
    return dynamoDBdata;

  }
}
