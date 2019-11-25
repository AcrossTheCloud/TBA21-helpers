const exiftool = require('exiftool.js');
const download = require('./common').download;
const delete_empty_strings = require('./common').delete_empty_strings;
const pgp = require('pg-promise')();
const fs = require('fs');
const util = require('util');

const cn = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?ssl=${process.env.PGSSL}`;
//console.log(cn);

// Setup the connection
const db = pgp(cn);

const convertDegreeToDecimal = (degreeString, degreeRef) => {
  let components = degreeString.split(',');
  let decimalVal = Number(components[0]) + (Number(components[1]) / 60) + (Number(components[2]) / 60 / 60);
  if (degreeRef.toUpperCase().trim().match(/^(S|W)$/))
    decimalVal = -decimalVal;
  return decimalVal;
}

module.exports.handler = async (event,context) => {
  
  console.log('doing exif...');
  console.log(event);
  
  try {
    
    if (event.s3metadata.ContentLength > 500000000)
      console.log(`WARNING: the file size for ${event.decodedSrcKey} is over 500mb, this operation might fail.`);

    const srcBucket=(event.isHEI ? event.convertHEIresult.convertedBucket : event.srcBucket),
        srcKey = (event.isHEI ? event.convertHEIresult.convertedKey : event.srcKey),
        decodedSrcKey= decodeURIComponent(srcKey.replace(/\+/g, " "));
    
    let filename = await download(srcBucket, srcKey, decodedSrcKey);
    console.log(filename);
    
    const getExif = util.promisify(exiftool.getExifFromLocalFileUsingNodeFs);
    const exif = await getExif(fs, filename);
    console.log(exif);

    // Setup query
    let query = `UPDATE ${process.env.PG_ITEMS_TABLE}
    set updated_at = current_timestamp,
    exif =  $2
    where s3_key=$1
    RETURNING s3_key,exif;`;
    
    // Setup values
    let values = [event.createResult.db_s3_key, exif ];
    
    let exifLongitude,exifLatitude,exifAltitude;
    try{
      exifLongitude=exif.GPSLongitude.indexOf(',') >= 0 ? convertDegreeToDecimal(exif.GPSLongitude,exif.GPSLongitudeRef)  : Number(exif.GPSLongitude);
      exifLatitude=exif.GPSLatitude.indexOf(',') >= 0 ? convertDegreeToDecimal(exif.GPSLatitude,exif.GPSLatitudeRef)  : Number(exif.GPSLatitude); 
      exifAltitude = Number(exif.GPSAltitude) || 0;
    } catch(err){
      console.log('Error in extracting geolocation from exif...')
      console.log(err);
      
    }
    if (exifLatitude && exifLongitude) {
      query = `UPDATE ${process.env.PG_ITEMS_TABLE}
      set updated_at = current_timestamp,
      exif =  $2,
      geom = ST_SetSRID(ST_ForceCollection(ST_MakePoint($3,$4,$5)),4326)
      where s3_key=$1
      RETURNING s3_key, ST_AsText(geom);`;
      values.push(exifLongitude,exifLatitude,exifAltitude);
    }
    
    
    
    // Execute
    console.log(query, values);
    let data = await db.one(query, values);
    
    console.log(data);
    return ({ success: true, "result":exif });
    //return data; //no need for return here ? 
  }
  catch (err) {
    console.log(err);
    return ({ success: false }); // ok to pass with success:false 
  }
}
