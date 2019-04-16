process.env.PATH += ':/var/task/bin'; // add our bin folder to path
const exifDB = require('exiftool-json-db');
const download = require('./common').download;
const delete_empty_strings = require('./common').delete_empty_strings;
const pgp = require('pg-promise')();

const cn = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?ssl=${process.env.PGSSL}`;
//console.log(cn);

// Setup the connection
let db = pgp(cn);



module.exports.handler = async (event,context,callback) => {

  console.log('doing exif...');
  console.log(event);

  try {


      if (event.s3metadata.ContentLength > 500000000)
        console.log(`WARNING: the file size for ${event.decodedSrcKey} is over 500mb, this operation might fail.`);

      let filename = await download(event.srcBucket, event.srcKey, event.decodedSrcKey);
      const emitter = exifDB.create({
        media: '/tmp',
        database: '/tmp/exif.json'
      });

      let end = new Promise(function (resolve, reject) {
        emitter.on('done', () => resolve(require('/tmp/exif.json')));
        emitter.on('error', reject); // or something like that
      });

      let exif = await end;
      delete_empty_strings(exif);
      console.log(exif); //for testing


      // Setup query
      let query = `UPDATE ${process.env.PG_IMAGE_METADATA_TABLE}
        set updated_at = current_timestamp,
        metadata = metadata || $2
        where sha512=$1
        RETURNING sha512,metadata;`;

      // Setup values
      let values = [event.sha512Hash, { "exif": exif }];


      // Execute
      console.log(query, values);
      let data = await db.one(query, values);


      console.log(data);
      callback(null, data);
      return data; //no need for return here ? 


  }
  catch (err) {
    console.log(err);
    callback(err);
  }
}
