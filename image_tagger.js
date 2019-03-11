const AWS = require('aws-sdk');

const rekognition = new AWS.Rekognition();
const pgp = require('pg-promise')();

const cn = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?ssl=${process.env.PGSSL}`;
logger.debug(cn);

// Setup the connection
const db = pgp(cn);


exports.handler = async (event) => {

  if (event.magic.match(/jpeg/) || event.magic.match(/png/)) {

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
      let requestData = { "key": event.decodedSrcKey, "labels": rekognitionData.Labels };


      // Setup query
      let query = `INSERT INTO ${process.env.IMAGE_TAG_TABLE}
              (decodedsrckey,created_at, updated_at, metadata, the_geom)
              VALUES ($1, current_timestamp, current_timestamp, $2, ST_SetSRID(ST_Point($3,$4),4326))
              RETURNING decodedsrckey`;

      // Setup values
      let values = [requestData.key, { "labels": requestData.labels  },0,0 ];

      // Execute
      logger.debug(query, values);
      db.oneOrNone(query, values).timeout((process.env.PGTIMEOUT || 10000))
        .then((data) => {
          console.log(data);

        })
        .catch((err) => {
          console.log(err);
        });

    }
  }
}
