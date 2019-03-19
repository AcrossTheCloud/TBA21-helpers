const AWS = require('aws-sdk');
const util = require('util');
const imageHash = util.promisify(require('image-hash'));
const crypto = require('crypto');
const s3 = new AWS.S3();

const pgp = require('pg-promise')();

const cn = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?ssl=${process.env.PGSSL}`;
//console.log(cn);

// Setup the connection
let db = pgp(cn);





module.exports.handler = async (event, context, callback) => {

  console.log('doing hashes...');
  console.log(event);

  try {

    let s3ObjectParams = {
      Bucket: event.srcBucket,
      Key: event.decodedSrcKey
    }


    let hashes = {};


    function checksumFile(hashName, s3Params) {
      return new Promise((resolve, reject) => {
        let hash = crypto.createHash(hashName);
        let stream = s3.getObject(s3Params).createReadStream();
        stream.on('error', err => reject(err));
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
      });
    }


    let sha512Hash = await checksumFile('sha512', s3ObjectParams);

    hashes.md5 = await checksumFile('md5', s3ObjectParams);


    if (event.srcKey.toLowerCase().match(/(\.png|\.jpg|\.jpeg)$/)) {
      try {

        const signedUrlExpireSeconds = 60 * 30; //30 minutes should be more than enough
        s3ObjectParams.Expires = signedUrlExpireSeconds;
        const imgUrl = s3.getSignedUrl('getObject', s3ObjectParams);
        console.log(imgUrl);

        hashes.imageHash = await imageHash(imgUrl, 16, true);
      } catch (err) {
        console.log('Could not compute image-hash, moving on...');
        console.log(err);
      }

    }




    // Setup query
    let query = `INSERT INTO ${process.env.PG_IMAGE_METADATA_TABLE}
        (sha512,decodedsrckey,created_at, updated_at, metadata)
        VALUES ($1, $2, current_timestamp, current_timestamp, $3)
        RETURNING sha512;`;

    // Setup values
    let values = [sha512Hash, event.decodedSrcKey, { "hashes": hashes }];


    // Execute
    console.log(query, values);
    let data = await db.one(query, values);
    callback(null, Object.assign(event, {"sha512Hash": data.sha512Hash}));



  }
  catch (ex) {
    callback(ex);
    console.log(ex);
  }

}
