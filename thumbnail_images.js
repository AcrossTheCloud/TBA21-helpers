// process.env.PATH += ":"+process.env.LAMBDA_TASK_ROOT+"/bin"
// process.env.LD_LIBRARY_PATH += ":"+process.env.LAMBDA_TASK_ROOT+"/lib"

const stream = require('stream');
const AWS = require('aws-sdk');
const sharp = require('sharp');
const s3 = new AWS.S3();
const pgp = require('pg-promise')();
const cn = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?ssl=${process.env.PGSSL}`;
const db = pgp(cn);

const s3WriteableStream = (destBucket, destKey) => {
  let pass = new stream.PassThrough();

  let params = { Bucket: destBucket, Key: destKey, Body: pass };
  let prom = s3.upload(params).promise();

  return { writeStream: pass, promise: prom };
}

cleanTmpDir = async () => {
  const directory = '/tmp';
  try {
    const files = await readdir(directory);
    const unlinkPromises = files.map(filename => unlink(`${directory}/${filename}`));
    return Promise.all(unlinkPromises);
  } catch (err) {
    console.log(err);
  }

}

module.exports.handler = async (event, context) => {

  console.log('doing image thumbnailing');
  console.log(event);

  try {


    let s3ObjectParams = {
      Bucket: (event.isHEI ? event.convertHEIresult.convertedBucket : event.srcBucket),
      Key: (event.isHEI ? event.convertHEIresult.convertedKey : event.decodedSrcKey)
    }

    const getImageMetaData = new Promise((resolve, reject) => {

      const metaReader = sharp();

      metaReader
        .metadata()
        .then(info => {
          resolve(info)
        }).catch(err => {
          reject(err)
        });

      let readableStream = s3.getObject(s3ObjectParams).createReadStream().on('error', (err) => {
        reject(err);
      });
      readableStream.pipe(metaReader).on('error', (err) => {
        reject(err);
      });


    });

    const readTransofrmWrite = (targetWidth) => (new Promise((resolve, reject) => {

      let readableStream = s3.getObject(s3ObjectParams).createReadStream().on('error', (err) => {
        reject(err);
      });

      let transformer = sharp()
        .limitInputPixels(false)
        .resize(targetWidth)
        .png()
        .on('info', function (info) {
          //console.log('Image height is ' + info.height);
        });

      const newKey = s3ObjectParams.Key + '.thumbnail' + targetWidth + '.png';

      let { writeStream, promise } = s3WriteableStream(process.env.THUMBNAIL_BUCKET, newKey)

      readableStream.pipe(transformer).on('error', (err) => {
        reject(err);
      }).pipe(writeStream).on('error', (err) => {
        reject(err);
      }).on('finish', () => {
        console.log('Streams finished.');
      });

      promise.then((data) => {
        console.log(data);
        resolve(data);
      }).catch((err) => {
        reject(err);
      })


    }));

    let imageMetaData = await getImageMetaData;
    console.log(imageMetaData);

    // Setup query
    const query = `UPDATE ${process.env.PG_ITEMS_TABLE}
    set updated_at = current_timestamp,
    file_dimensions =  $2
    where s3_key=$1
    RETURNING s3_key,file_dimensions;`;

    // Setup values
    const values = [event.createResult.db_s3_key, [imageMetaData.width, imageMetaData.height]];

    // Execute
    console.log(query, values);
    let data = await db.one(query, values);
    console.log(data);

    let resolvedData = [];

    switch (true) {
      case (imageMetaData.width > 1140):
        resolvedData.push(await readTransofrmWrite(1140));
      case (imageMetaData.width > 960):
        resolvedData.push(await readTransofrmWrite(960));
      case (imageMetaData.width > 720):
        resolvedData.push(await readTransofrmWrite(720));
      case (imageMetaData.width > 540):
        resolvedData.push(await readTransofrmWrite(540));

    }

    await cleanTmpdir();


    return ({ uploadedObjects: resolvedData });



  } catch (err) {
    console.log(err);
    throw new Error(err.message); // does need to fail as subsequent steps depend on it 
  }

}
