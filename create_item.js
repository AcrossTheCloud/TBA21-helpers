const AWS = require('aws-sdk');

const pgp = require('pg-promise')();

const cn = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?ssl=${process.env.PGSSL}`;
//console.log(cn);

// Setup the connection
const db = pgp(cn);

const isValidUUID=(str) => (str.search(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)>=0)

const downloadTextTypes = [
  'msword',
  'vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'vnd.ms-', // vnd.ms-powerpoint , excel etc
  'vnd.openxmlformats', // pptx powerpoint
  'vnd.oasis.opendocument', // OpenDocument
  'epub+zip',
  'rtf', // Rich text
  'xml',
  'vnd.amazon',
];

module.exports.handler = async (event, context, callback) => {

  console.log('Creating item...');
  console.log(event);

  try {

    let cuuid;
    try{
     cuuid=event.decodedSrcKey.split('/')[2];
     if (!isValidUUID(cuuid))
       cuuid=null;
      
    }catch(e)
    {
      cuuid=null;
    }

    let type = null;

    switch (true) {
      case (event.s3metadata.ContentType.match(/image/i)):
        type = 'Image';
        break;
      case (event.s3metadata.ContentType.match(/audio/i)):
        type = 'Audio';
        break;
      case (event.s3metadata.ContentType.match(/video/i)):
        type = 'Video';
        break;
      case (downloadTextTypes.reduce(
        (overall, item) => {
          return overall || event.s3metadata.ContentType.match((new RegExp(item), "i"));
        },
        false
      )):
        type = 'DownloadText'
        break;
      case (event.s3metadata.ContentType.match(/text/i)):
        type = 'Text';
        break;
      case(event.s3metadata.ContentType.match(/pdf/i)):
        type = 'PDF'
        break;
      default:
        break;
    }

    let query, values;
    // Setup query
    if (type) {
      query = `INSERT INTO ${process.env.PG_ITEMS_TABLE}
          (s3_key,status, contributor, item_type, created_at, updated_at)
          VALUES ($1, $2, $3, $4, current_timestamp, current_timestamp)
          RETURNING s3_key;`;

      // Setup values
      values = [event.decodedSrcKey,false,cuuid,type];
    } else {
      query = `INSERT INTO ${process.env.PG_ITEMS_TABLE}
          (s3_key,status, contributor, created_at, updated_at)
          VALUES ($1, $2, $3, $4, current_timestamp, current_timestamp)
          RETURNING s3_key;`;

      // Setup values
      values = [event.decodedSrcKey,false,cuuid];
    }


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
      callback(err); // does need to fail in this case as subsequent steps depend on it
    console.log(err);
  }

}
