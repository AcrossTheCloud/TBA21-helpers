const AWS = require('aws-sdk');
const crypto = require('crypto');
const s3 = new AWS.S3();

const pgp = require('pg-promise')();

const cn = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?ssl=${process.env.PGSSL}`;
//console.log(cn);

// Setup the connection
const db = pgp(cn);



module.exports.handler = async (event, context, callback) => {

  console.log('doing hashes...');
  console.log(event);


  try {

    let s3ObjectParams = {
      Bucket: event.srcBucket,
      Key: event.decodedSrcKey
    }




    function checksumFile(hashName, s3Params) {
      return new Promise((resolve, reject) => {
        let hash = crypto.createHash(hashName);
        let stream = s3.getObject(s3Params).createReadStream();
        stream.on('error', err => reject(err));
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
      });
    }


    const sha512Hash = await checksumFile('sha512', s3ObjectParams);
    const md5 = await checksumFile('md5', s3ObjectParams);




    // Setup query
    const query = `UPDATE ${process.env.PG_ITEMS_TABLE}
        set sha512 = $2, 
        md5 = $3, 
        updated_at = current_timestamp
        where s3_key=$1
        RETURNING s3_key,contributor,sha512,md5;`;

    // Setup values
    const values = [event.createResult.db_s3_key,sha512Hash, md5];


    // Execute
    //console.log(query, values);
    let data = await db.one(query, values);
    console.log(data);
    callback(null, { success: true });



  }
  catch (err) {
      callback(null, { success: false }); //succeed anyway so that other step functions proceed
      console.log(err);
  }

}
