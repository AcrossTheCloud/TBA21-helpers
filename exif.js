process.env.PATH += ':'+process.env.LAMBDA_TASK_ROOT+'/bin'; // add our bin folder to path
const exifDB = require('exiftool-json-db');
const download = require('./common').download;
const cleanTmpDir = require('./common').cleanTmpDir;
const delete_empty_strings = require('./common').delete_empty_strings;
const pgp = require('pg-promise')();
const fs = require('fs');





const cn = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?ssl=${process.env.PGSSL}`;
//console.log(cn);

// Setup the connection
let db = pgp(cn);



module.exports.handler = async (event,context,callback) => {

  console.log('doing exif...');
  console.log(event);

  try {
    await cleanTmpDir();
    console.log('Cleaned /tmp ...');


    if (event.s3metadata.ContentLength > 500000000)
      console.log(`WARNING: the file size for ${event.decodedSrcKey} is over 500mb, this operation might fail.`);

    let filename = await download(event.srcBucket, event.srcKey, event.decodedSrcKey);
    console.log(filename);
    const emitter = exifDB.create({
      media: '/tmp',
      database: '/tmp/exif.json'
    });

    let end = new Promise(function (resolve, reject) {
      emitter.on('done', (files) => {
        console.log('Processed files are: ');
        console.log(files);
        fs.readFile('/tmp/exif.json', (err, data) => {
          if (err)
            reject(err);
          else
            resolve(JSON.parse(data))
        });

      });
      emitter.on('error', reject); // or something like that
    });

    let exifDb = await end;
    delete_empty_strings(exifDb);
    console.log(exifDb); //for testing

    let exif=exifDb.find((elem) => (elem.SourceFile === (filename.replace('/tmp/','')) ));
    console.log('Filtered exif record');
    console.log(exif);

    


    // Setup query
    let query = `UPDATE ${process.env.PG_ITEMS_TABLE}
        set updated_at = current_timestamp,
        exif =  $2
        where s3_key=$1
        RETURNING s3_key,exif;`;

    // Setup values
    let values = [event.hashResult.db_s3_key, exif ];

     let exifLongitude,exifLatitude;
     try{
      exifLongitude=Number(exif.Composite.GPSLongitude);
      exifLatitude=Number(exif.Composite.GPSLatitude);
     } catch(err){
       console.log('Error in extracting geolocation from exif...')
       console.log(err);

     }
    if (exifLatitude && exifLongitude) {
      query = `UPDATE ${process.env.PG_ITEMS_TABLE}
              set updated_at = current_timestamp,
              exif =  $2,
              location = ST_SetSRID(ST_Point($3,$4),4326)
              where s3_key=$1
              RETURNING s3_key, location;`;
      values.push(exifLongitude,exifLatitude);
    }



    // Execute
    console.log(query, values);
    let data = await db.one(query, values);


    console.log(data);
    callback(null, { success: true });
    //return data; //no need for return here ? 


  }
  catch (err) {
    console.log(err);
    callback(err);
  }
}
