const AWS = require('aws-sdk');
const s3 = new AWS.S3();

module.exports.handler = (event, context, callback) => {

  console.log('Doing copy_for_vid_transcoding ...');
  let uploadId = null;
  let completeData = null;
  try {

    const params = {
      Bucket: process.env.TRANSCODE_BUCKET,
      Key: event.decodedSrcKey
    };

    if (event.s3metadata.ContentLength < (5 * 1024 * 1024 * 1024)) {
      console.log(params);
      const completeData = await s3.copyObject(params).promise();
    }
    else {


      const data = await s3.createMultipartUpload(params).promise();

      console.log(data);           // successful response
      /* should return:
  data = {
   Bucket: "examplebucket", 
   Key: "largeobject", 
   UploadId: "ibZBv_75gd9r8lH_gqXatLdxMVpAlj6ZQjEs.OwyF3953YdwbcQnMA2BLGn8Lx12fQNICtMw5KyteFeHw.Sjng--"
  }
  */

      uploadId = data.UploadId;
      let partCounter = 0;
      let allPartsResult = [];



      while (true) {
        partCounter++;
        const copyParams = {
          Bucket: params.Bucket,
          CopySource: `/${event.srcBucket}/${event.srcKey}`,
          Key: params.Key,
          PartNumber: partCounter,
          UploadId: uploadId
        };

        const partUploadData = await s3.uploadPartCopy(copyParams).promise();

        console.log(partUploadData);           // successful response
        /*
        data = {
         CopyPartResult: {
          ETag: "\"b0c6f0e7e054ab8fa2536a2677f8734d\"", 
          LastModified: <Date Representation>
         }
        }
        */
        if (!partUploadData.CopyPartResult)
          break;
        allPartsResult.push({ ETag: partUploadData.CopyPartResult.ETag, PartNumber: partCounter });

      }

      var completeParams = {
        Bucket: params.Bucket,
        Key: params.Key,
        MultipartUpload: {
          Parts: allPartsResult
        },
        UploadId: uploadId
      };
      completeData = await s3.completeMultipartUpload(completeParams)
      console.log(completeData);           // successful response
      /*
      data = {
       Bucket: "acexamplebucket", 
       ETag: "\"4d9031c7644d8081c2829f4ea23c55f7-2\"", 
       Key: "bigobject", 
       Location: "https://examplebucket.s3.amazonaws.com/bigobject"
      }
      */

    }

    callback(null, { success: true, result: completeData }); //succeed anyway so that other step functions proceed
  } catch (err) {
    console.log(err);

    if (uploadId) {
      const abortData = await s3.abortMultipartUpload({
        Bucket: params.Bucket,
        Key: params.Key,
        UploadId: uploadId
      });
      console.log(abortData);
    }

    callback(err);

  }

}
