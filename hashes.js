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
    let query = `INSERT INTO ${process.env.PG_ITEMS_TABLE}
        (s3_key,contributor,status,sha512,created_at, updated_at, md5)
        VALUES ($1, $2, $3, $4, current_timestamp, current_timestamp, $5)
        RETURNING s3_key;`;

    // Setup values
    let values = [event.decodedSrcKey,event.decodedSrcKey.split('/')[1].split(':')[1],false,sha512Hash, md5];


    // Execute
    //console.log(query, values);
    let data = await db.one(query, values);
    console.log(data);
    callback(null,  {'db_s3_key':data.s3_key , 'isDuplicate':false });



  }
  catch (err) {
    if (err.detail && err.detail.indexOf("already exists")>=0)
     callback(null, {'db_s3_key':event.decodedSrcKey , 'isDuplicate':true  });//succeed to proceed to parallel states
    else 
      callback(err);
    console.log(err);
  }

}
