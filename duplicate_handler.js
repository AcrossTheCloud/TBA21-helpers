const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const pgp = require('pg-promise')();

const cn = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?ssl=${process.env.PGSSL}`;
//console.log(cn);

// Setup the connection
const db = pgp(cn);



module.exports.handler = async (event, context) => {

  console.log('doing duplicate handling...');
  console.log(event);



  try {

    // Setup query
    let query = `select ID_sha512,all_s3_keys from  ${process.env.PG_IMAGE_METADATA_TABLE}
                   where ID_sha512=$1;`;

    // Setup values
    let values = [event.hashResult.sha512Hash];
    // Execute
    //console.log(query, values);
    let data = await db.one(query, values);
    console.log(data);

    let oldKey = data.all_s3_keys[0];
    let allkeys = data.all_s3_keys || [];

    if (oldKey === event.decodedSrcKey) {
      //same object reuploaded , do nothing
      return ({ success: true });
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
        all_s3_keys = $2
        where ID_sha512=$1
        RETURNING ID_sha512,all_s3_keys;`;
        allkeys.push(event.decodedSrcKey);

        // Setup values
        values = [event.hashResult.sha512Hash, allkeys ];

      } catch (headErr) {
        console.log(headErr);
        if (headErr.code === 'NotFound') {
          console.log('Object does not exist, updating the original key...');
          // Setup query
          query = `UPDATE ${process.env.PG_IMAGE_METADATA_TABLE}
                        set updated_at = current_timestamp,
                        all_s3_keys=$2
                        where ID_sha512=$1
                        RETURNING ID_sha512,all_s3_keys;`;

          // Setup values
          values = [event.hashResult.sha512Hash, [event.decodedSrcKey]];

        } else {
          throw new Error(headErr.message);
        }
      }
      data = await db.one(query, values);
      console.log(data);
      return ({ success: true });



    }




  }
  catch (err) {
    console.log(err);
    throw new Error(err.message);
  }

}
