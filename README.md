# TBA21-helpers
processing scripts for TBA21:
* Transcode video to different video formats for AWS CloudFront streaming by copying to another s3 bucket to trigger [step function](https://github.com/AcrossTheCloud/video-on-demand-on-aws) for using Elastic Transcoder in a fault tolerant way.
* Transcode video and audio to Amazon Alexa ready audio files.
* Use AWS Rekognition to put image tags in AWS RDS (PostgreSQL).
* Store file hashes, and (for image files) image hashes, which can aid in duplicate detection.
* Extract [Exif image metadata](https://en.wikipedia.org/wiki/Exif) such as focal length, exposure, geolocation, etc. from image files and store in AWS RDS (PostgreSQL).
* RAW image conversion to JPG.

## Step diagram
![Step function diagram](step_diagram.png)

## Included code
* [dcraw](src/drcraw.c) by Dave Coffin from [http://www.cybercom.net/~dcoffin/dcraw/](http://www.cybercom.net/~dcoffin/dcraw/).
* [exiftool](src/exiftool) by Phil Harvey from [https://sno.phy.queensu.ca/~phil/exiftool/](https://sno.phy.queensu.ca/~phil/exiftool/) under [Perl licence](http://dev.perl.org/licenses/)
* [cjpeg](jpeg-9c) jpeg tools from the [JPEG Club](http://jpegclub.org/)

## Configuration notes
On the [video-on-demand](https://github.com/awslabs/video-on-demand-on-aws) source bucket, either set a lifecyle policy to transition to glacier (available as an option through the CloudFormation template for setting up video-on-demand) or alternatively to expire after a day.

## Test files
* [test_files/colorchart-eos-7d.cr2](test_files/colorchart-eos-7d.cr2) from https://github.com/syoyo/raw-images under CC-BY 4.0 licence.