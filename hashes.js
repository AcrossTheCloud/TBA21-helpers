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

  let sha512Hash;

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


    sha512Hash = await checksumFile('sha512', s3ObjectParams);

    let md5 = await checksumFile('md5', s3ObjectParams);







    // Setup query
    let query = `INSERT INTO ${process.env.PG_IMAGE_METADATA_TABLE}
        (ID_sha512,all_s3_keys,created_at, updated_at, md5)
        VALUES ($1, $2, current_timestamp, current_timestamp, $3)
        RETURNING ID_sha512;`;

    // Setup values
    let values = [sha512Hash, [event.decodedSrcKey], md5];


    // Execute
    //console.log(query, values);
    let data = await db.one(query, values);
    console.log(data);
    callback(null,  {'sha512Hash':data.sha512 , 'isDuplicate':false });



  }
  catch (err) {
    if (err.detail && err.detail.indexOf("already exists")>=0)
     callback(null, {'sha512Hash':sha512Hash , 'isDuplicate':true  });//succeed to proceed to parallel states
    else 
      callback(err);
    console.log(err);
  }

}
