
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
  
  try {

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

      const rekognitionData = await rekognition.detectLabels(params).promise();
      const labels = rekognitionData.Labels;

      console.log('Labels: ');
      console.log(labels);


      if ( Array.isArray(labels) &&( labels.length > 0)) {

        // Setup query
        let query = `UPDATE ${process.env.PG_ITEMS_TABLE}
        set updated_at = current_timestamp,
        machine_recognition_tags =  $2
        where s3_key=$1
        RETURNING s3_key, machine_recognition_tags;`;

        // Setup values
        let values = [event.hashResult.db_s3_key,  {'rekognition_labels': labels} ];


        // Execute
        console.log(query, values);
        let data = await db.one(query, values);


        console.log(data);
        callback(null, {'success':true});

      }
  } catch (err) {
    console.log(err);
    callback(err);
  }
}
