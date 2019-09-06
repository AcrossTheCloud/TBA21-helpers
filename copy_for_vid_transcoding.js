const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const COPY_SIZE_LIMIT = (5 * 1024 * 1024 * 1024); //5GB

module.exports.handler = (event, context, callback) => {

  const objectSize = event.s3metadata.ContentLength;

  console.log('Doing copy_for_vid_transcoding ...');
  let uploadId = null;
  let completeData = null;
  try {

    const params = {
      Bucket: process.env.TRANSCODE_BUCKET,
      Key: event.decodedSrcKey
    };

    if (objectSize < COPY_SIZE_LIMIT) {
      console.log('Uploading small file (<5GB)...');
      console.log(params);
      completeData = await s3.copyObject(params).promise();
    }
    else {



      const data = await s3.createMultipartUpload(params).promise();

      console.log(data);           // successful response

      uploadId = data.UploadId;
      let allPartsResult = [];
      let nChunks = Math.floor(Numbert(objectSize) / COPY_SIZE_LIMIT) + 1;
      let chunkSize = Math.round(objectSize / nChunks);
      let rangeStart = 0;
      let rangeEnd = chunkSize;
      let rangeString;

      for (let partNumber = 1; partNumber <= nChunks; partNumber++) {
        rangeString = `bytes=${rangeStart}-${rangeEnd}`;

        const copyParams = {
          Bucket: params.Bucket,
          CopySource: `/${event.srcBucket}/${event.srcKey}`,
          CopySourceRange: rangeString,
          Key: params.Key,
          PartNumber: partNumber,
          UploadId: uploadId
        };

        console.log('Uploading ...');
        console.log(copyParams);

        const partUploadData = await s3.uploadPartCopy(copyParams).promise();

        console.log(partUploadData);           // successful response
        console.log('...done.');

        allPartsResult.push({ ETag: partUploadData.CopyPartResult.ETag, PartNumber: partNumber });
        rangeStart = rangeEnd + 1;
        rangeEnd = (partNumber === nChunks) ? objectSize : rangeEnd + chunkSize;

      }

      var completeParams = {
        Bucket: params.Bucket,
        Key: params.Key,
        MultipartUpload: {
          Parts: allPartsResult
        },
        UploadId: uploadId
      };
      completeData = await s3.completeMultipartUpload(completeParams).promise();
      console.log(completeData);           // successful response


    }

    callback(null, { success: true, result: completeData }); //succeed anyway so that other step functions proceed
  } catch (err) {
    console.log(err);

    if (uploadId) {
      const abortData = await s3.abortMultipartUpload({
        Bucket: params.Bucket,
        Key: params.Key,
        UploadId: uploadId
      }).promise();
      console.log(abortData);
    }

    callback(err);

  }

}
