const AWS = require('aws-sdk');

const rekognition = new AWS.Rekognition();
const pgp = require('pg-promise')();

const cn = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?ssl=${process.env.PGSSL}`;
console.log(cn);

// Setup the connection
const db = pgp(cn);


exports.handler = async (event,context,callback) => {

  console.log('doing image_tagger:');
  console.log(event);

  console.log(event);
  
  try {

    if (event.s3metadata.ContentType.toLowerCase().match(/(jpeg|jpg|png|)/) || event.decodedSrcKey.toLowerCase().match(/\.hei[cf]$/)) {

      let params = {
        Image: {
          S3Object: {
            Bucket: event.srcBucket,
            Name: event.decodedSrcKey
          }
        },
        MaxLabels: 10,
        MinConfidence: 60
      };

      let rekognitionData = await rekognition.detectLabels(params).promise();

      if (rekognitionData.Labels.length > 0) {

        // Setup query
        let query = `UPDATE ${process.env.PG_IMAGE_METADATA_TABLE}
        set updated_at = current_timestamp,
        metadata = metadata || $2
        where sha512=$1
        RETURNING sha512,metadata;`;

        // Setup values
        let values = [event.sha512Hash, { "labels": rekognitionData.Labels }];


        // Execute
        console.log(query, values);
        let data = await db.one(query, values);


        console.log(data);
        callback(null, data);

      }
    }
  } catch (err) {
    console.log(err);
    callback(null,err);
  }
}
