const AWS = require('aws-sdk');
const Position = require('./position.js');
const SNSMessage = require('./snsmessage.js');
const s3 = new AWS.S3();


/**
 * A Lambda function that logs the payload received from S3.
 */
exports.handler = async (event, context, callback) => {
  
  const csv = require('fast-csv');
  const srcBucket = event.Records[0].s3.bucket.name;
  const srcKey    = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
  const typeMatch = srcKey.match(/\.([^.]*)$/);
  
  if (!typeMatch) {
      console.error("Could not determine the csv type.");
      const errorSNS = new SNSMessage(srcBucket, srcKey, "", "Could not determine the csv type.");
      SNSMessage.publishMessage(errorSNS);
      return;
  }
  const csvType = typeMatch[1].toLowerCase();
  if (csvType != "csv") {
      console.error(`Unsupported csv type: ${csvType}`);
      const errorSNS = new SNSMessage(srcBucket, srcKey, "", "Unsupported csv type");
      SNSMessage.publishMessage(errorSNS);
      return;
  }  
  const params = {
    Bucket: srcBucket,
    Key: srcKey
  };
  
  const stream = s3.getObject(params).createReadStream();
  
  csv.parseStream(stream.on('error', s3error => {
    const errorSNS = new SNSMessage(srcBucket, srcKey, "", s3error);
    SNSMessage.publishMessage(errorSNS);
    console.error(s3error);
  }), { headers: true })
  .on('error', error => {
    var rawData = '';
    if (typeof error.rawData !== 'undefined') {
      rawData = error.rawData;
    }
    const errorSNS = new SNSMessage(srcBucket, srcKey, rawData, error.message);
    SNSMessage.publishMessage(errorSNS);
    console.error(error);   
    return;
  })
  .on('data', (row) => {
    try {
      if (typeof row.latitude === 'undefined' || typeof row.longitude === 'undefined' || typeof row.address === 'undefined') {
        const formatError = new Error("heads are not matched by standard");
        formatError.rawData = row;
        formatError.stopFlag = true;
        throw formatError;
      }
      const position = new Position(row.latitude, row.longitude, row.address);
      Position.saveToDynamoDb(position);  
    }
    catch(e) {
      if (typeof e.rawData === 'undefined') {
        e.rawData = row;
      }
      if (e.stopFlag) {
        throw e;
      } 
      else {
        const errorSNS = new SNSMessage(srcBucket, srcKey, row, e.message);
        SNSMessage.publishMessage(errorSNS);
        console.error(e);
      }
    }
  });
};

