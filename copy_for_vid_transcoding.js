const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const COPY_SIZE_LIMIT = (5 * 1024 * 1024 * 1024); //5GB

module.exports.handler = async (event, context, callback) => {

  const objectSize = Number(event.s3metadata.ContentLength);

  console.log('Doing copy_for_vid_transcoding ...');
  let uploadId = null;
  let completeData = null;
  const params = {
    Bucket: process.env.TRANSCODE_BUCKET,
    Key: event.decodedSrcKey
  };

  try {

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
      let nChunks = Math.floor(objectSize / COPY_SIZE_LIMIT) + 1;
      let chunkSize = Math.round(objectSize / nChunks);
      let rangeStart = 0;
      let rangeEnd = chunkSize;
      let rangeString;

      for (let partNumber = 1; partNumber <= nChunks; partNumber++) {
        rangeString = `bytes=${rangeStart}-${rangeEnd}`;

        const copyParams = {
          ...params,
          CopySource: `/${event.srcBucket}/${event.srcKey}`,
          CopySourceRange: rangeString,
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
        rangeEnd = (partNumber === nChunks) ? (objectSize-1) : rangeEnd + chunkSize;

      }

      var completeParams = {
        ...params,
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
      console.log('Aborted successfully.');
      console.log(abortData);
    }

    callback(err);

  }

}
