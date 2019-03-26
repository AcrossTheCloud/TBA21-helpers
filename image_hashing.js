const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const util = require('util');
const imageHash = util.promisify(require('image-hash'));

const pgp = require('pg-promise')();

const cn = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?ssl=${process.env.PGSSL}`;

// Setup the connection
const db = pgp(cn);


exports.handler = async (event,context,callback) => {

  console.log('doing image_hashing:');
  console.log(event);
  
  try {
    let s3ObjectParams = {
      Bucket: event.srcBucket,
      Key: event.decodedSrcKey
    }

    if (event.srcKey.toLowerCase().match(/(\.png|\.jpg|\.jpeg)$/)) {


      const signedUrlExpireSeconds = 60 * 30; //30 minutes should be more than enough
      s3ObjectParams.Expires = signedUrlExpireSeconds;
      const imgUrl = s3.getSignedUrl('getObject', s3ObjectParams);
      console.log(imgUrl);

      let imgHash = await imageHash(imgUrl, 16, true);

      // Setup query
      let query = `UPDATE ${process.env.PG_IMAGE_METADATA_TABLE}
                set updated_at = current_timestamp,
                metadata = metadata || $2
                where sha512=$1
                RETURNING sha512,metadata;`;

      // Setup values
      let values = [event.sha512Hash,  {"imageHash": imgHash } ];


      // Execute
      console.log(query, values);
      let data = await db.one(query, values);


      console.log(data);
      callback(null, data);

    }

  } catch (err) {
    console.log(err);
    callback(err);
  }
}