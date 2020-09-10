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
      console.log("Could not determine the csv type.");
      return;
  }
  const csvType = typeMatch[1].toLowerCase();
  if (csvType != "csv") {
      console.log(`Unsupported csv type: ${csvType}`);
      return;
  }  
  const params = {
    Bucket: srcBucket,
    Key: srcKey
  };
  
  //const ccc = new SNSMessage(1, 1, 1, 1);
 // SNSMessage.publishMessage(ccc);
  
  const stream = s3.getObject(params).createReadStream();
  csv.parseStream(stream, { headers: true }).on('error', error => console.error(error))
    .on('data', (row) => {
      const position = new Position(row.latitude, row.longitude, row.address);
      Position.saveToDynamoDb(position);  
    })
    .on('end', rowCount => console.log(`Parsed ${rowCount} rows`));
  
};

