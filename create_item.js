const pgp = require('pg-promise')();

const cn = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?ssl=${process.env.PGSSL}`;
//console.log(cn);

const request = require('request-promise');

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

module.exports.handler = async (event, context) => {

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
    console.log(event.s3metadata.ContentType);

    switch (true) {
      case (/image/i.test(event.s3metadata.ContentType)):
        type = 'Image';
        break;
      case (/audio/i.test(event.s3metadata.ContentType)):
        type = 'Audio';
        break;
      case (/video/i.test(event.s3metadata.ContentType)):
        type = 'Video';
        break;
      case (downloadTextTypes.reduce(
        (overall, item) => {
          let re = new RegExp(item);
          return overall || re.test(event.s3metadata.ContentType);
        },
        false
      )):
        type = 'DownloadText'
        break;
      case (/text/i.test(event.s3metadata.ContentType)):
        type = 'Text';
        break;
      case(/pdf/i.test(event.s3metadata.ContentType)):
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
          RETURNING id, s3_key;`;

      // Setup values
      values = [event.decodedSrcKey,false,cuuid,type];
    } else {
      query = `INSERT INTO ${process.env.PG_ITEMS_TABLE}
          (s3_key,status, contributor, created_at, updated_at)
          VALUES ($1, $2, $3, current_timestamp, current_timestamp)
          RETURNING id, s3_key;`;

      // Setup values
      values = [event.decodedSrcKey,false,cuuid];
    }


    // Execute
    //console.log(query, values);
    let pgdata = await db.one(query, values);
    console.log(pgdata);

    const options = {
      method: `POST`,
      json: false,
      headers: {
        'X-API-KEY': process.env.QLDB_API_KEY
      },
      uri: process.env.QLDB_API_URL,
      body: `INSERT INTO item_history VALUE {'id': ${pgdata.id}};`
    };

    let qldbres = await(request(options));
    console.log(qldbres);

    return ({'db_s3_key':data.s3_key , 'isDuplicate':false });

  }
  catch (err) {
    console.log(err);
    if (err.detail && err.detail.indexOf("already exists")>=0)
     return ({'db_s3_key':event.decodedSrcKey , 'isDuplicate':true  });//succeed to proceed to parallel states
    else 
      throw new Error(err.message); // does need to fail in this case as subsequent steps depend on it

  }

}
