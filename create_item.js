const AWS = require('aws-sdk');

const pgp = require('pg-promise')();

const cn = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?ssl=${process.env.PGSSL}`;
//console.log(cn);

// Setup the connection
const db = pgp(cn);

const isValidUUID=(str) => (str.search(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)>=0)



module.exports.handler = async (event, context, callback) => {

  console.log('Creating item...');
  console.log(event);

  try {

    let cuuid;
    try{
     cuuid=event.decodedSrcKey.split('/')[1].split(':')[1];
     if (!isValidUUID(cuuid))
       cuuid=null;
      
    }catch(e)
    {
      cuuid=null;
    }




    // Setup query
    let query = `INSERT INTO ${process.env.PG_ITEMS_TABLE}
        (s3_key,status, contributor, created_at, updated_at)
        VALUES ($1, $2, $3, current_timestamp, current_timestamp)
        RETURNING s3_key;`;

    // Setup values
    let values = [event.decodedSrcKey,false,cuuid];


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
