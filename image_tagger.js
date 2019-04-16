
const rp = require('request-promise');

const pgp = require('pg-promise')();

const cn = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?ssl=${process.env.PGSSL}`;
console.log(cn);

// Setup the connection
const db = pgp(cn);


exports.handler = async (event,context,callback) => {

  console.log('doing image_tagger:');
  console.log(event);
  
  try {

    if (event.copy_for_rekognition_results.rekognitionBucket && event.copy_for_rekognition_results.rekognitionKey) {


      var options = {
        uri: process.env.API_ENDPOINT,
        qs: {
          bucketname: event.rekognitionBucket,
          decodedsrckey: event.rekognitionKey
        },
        headers: {
          'x-api-key': process.env.API_KEY_REKOGNITION
        },
        json: true // Automatically parses the JSON string in the response
      };

      let labels = await rp(options);

      console.log('Labels: ');
      console.log(labels);


      if ( Array.isArray(labels) &&( labels.length > 0)) {

        // Setup query
        let query = `UPDATE ${process.env.PG_IMAGE_METADATA_TABLE}
        set updated_at = current_timestamp,
        metadata = metadata || $2
        where sha512=$1
        RETURNING sha512,metadata;`;

        // Setup values
        let values = [event.sha512Hash, { "labels": labels }];


        // Execute
        console.log(query, values);
        let data = await db.one(query, values);


        console.log(data);
        callback(null, data);

      }
    }else{
      console.log('File type not supported for rekognition.');
    }
  } catch (err) {
    console.log(err);
    callback(err);
  }
}
