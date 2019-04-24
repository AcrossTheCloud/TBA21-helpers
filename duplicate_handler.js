const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const pgp = require('pg-promise')();

const cn = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?ssl=${process.env.PGSSL}`;
//console.log(cn);

// Setup the connection
const db = pgp(cn);



module.exports.handler = async (event, context, callback) => {

  console.log('doing duplicate handling...');
  console.log(event);



  try {

    // Setup query
    let query = `select sha512,decodedsrckey, metadata from  ${process.env.PG_IMAGE_METADATA_TABLE}
                   where sha512=$1;`;

    // Setup values
    let values = [event.hashResult.sha512Hash];
    // Execute
    //console.log(query, values);
    let data = await db.one(query, values);
    console.log(data);

    let oldKey = data.decodedsrckey;
    let duplicateKeys = data.metadata.duplicateKeys || [];

    if (oldKey === event.decodedSrcKey) {
      //same object reuploaded , do nothing
      callback(null, { success: true });
    } else {
      let params = {
        Bucket: event.srcBucket,
        Key: oldKey
      }
      try {

        const headCode = await s3.headObject(params).promise();
        console.log(headCode);
        console.log('object exists putting duplicate in...');
        query = `UPDATE ${process.env.PG_IMAGE_METADATA_TABLE}
        set updated_at = current_timestamp,
        metadata = metadata || $2
        where sha512=$1
        RETURNING sha512,decodedsrckey, metadata;`;
        duplicateKeys.push(event.decodedSrcKey);

        // Setup values
        values = [event.hashResult.sha512Hash, { "duplicateKeys": duplicateKeys }];


        // Do something with signedUrl
      } catch (headErr) {
        console.log(headErr);
        if (headErr.code === 'NotFound') {
          console.log('Object does not exist, updating the original key...');
          // Setup query
          query = `UPDATE ${process.env.PG_IMAGE_METADATA_TABLE}
                        set updated_at = current_timestamp,
                        decodedsrckey=$2
                        where sha512=$1
                        RETURNING sha512,decodedsrckey;`;

          // Setup values
          values = [event.hashResult.sha512Hash, event.decodedSrcKey];

        } else {
          callback(headErr);
          return;
        }
      }
      data = await db.one(query, values);
      console.log(data);
      callback(null, { success: true });



    }




  }
  catch (err) {
    callback(err);
    console.log(err);
  }

}
