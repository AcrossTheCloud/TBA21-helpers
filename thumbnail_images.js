// process.env.PATH += ":"+process.env.LAMBDA_TASK_ROOT+"/bin"
// process.env.LD_LIBRARY_PATH += ":"+process.env.LAMBDA_TASK_ROOT+"/lib"

const stream = require('stream');
const AWS = require('aws-sdk');
const sharp = require('sharp');
const s3 = new AWS.S3();

const s3WriteableStream = (destBucket, destKey) => {
  let pass = new stream.PassThrough();

  let params = {Bucket: destBucket, Key: destKey, Body: pass};
  s3.upload(params, function(err, data) {
    console.log('in upload callback');
    console.log(err, data);
  });

  return pass;
}


module.exports.handler = async(event,context,callback) => {

  console.log('doing image thumbnailing');
  console.log(event);

  try {


    let s3ObjectParams = {
      Bucket: event.srcBucket,
      Key: event.decodedSrcKey
    }

    const getImageMetaData = new Promise((resolve, reject) => {
      const metaReader = sharp()
        .metadata()
        .then(info => {
          resolve(info)
        })
        .catch(err => {
          reject(err)
        });

      let readableStream = s3.getObject(s3ObjectParams).createReadStream().on('error', (err) => {
        reject(err);
      });
      readableStream.pipe(metaReader);


    });

    const readTransofrmWrite = new Promise((resolve, reject) => {

      let readableStream = s3.getObject(s3ObjectParams).createReadStream().on('error', (err) => {
        reject(err);
      });

      let transformer = sharp()
        .resize(200, 200)
        .png()
        .on('info', function (info) {
          console.log('Image height is ' + info.height);
        });

      const newKey = s3ObjectParams.Key + '.thumbnail.png';

      let writeStream = s3WriteableStream(process.env.THUMBNAIL_BUCKET, newKey)

      readableStream.pipe(transformer).on('error', (err) => {
        reject(err);
      }).pipe(writeStream).on('error', (err) => {
        reject(err);
      }).on('finish', () => {
        resolve(newKey);
      });



    });

    let imageMeta= await getImageMetaData;
    console.log(imageMeta);

    let data=await readTransofrmWrite;

    callback(null,{ key: data });


    
  } catch (err) {
    console.log(err);
    callback(err); // does need to fail as subsequent steps depend on it 
  }

}
