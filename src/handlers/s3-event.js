const AWS = require('aws-sdk');
const Position = require('./position.js');
const SNSMessage = require('./snsmessage.js');
const s3 = new AWS.S3();
const csv = require('fast-csv');


exports.handler = async (event, context, callback) => {
  console.info(event);
  console.info("start handle");
  return readCSVFileByEvent(event, context, callback).then((data) => {
    console.info("finished handle");
  }).catch(err => {
    console.error(err);
  });
};

function errorLog(error, s3FileInfo, rawData, reject) {
  console.error(error);
  const errorSNS = new SNSMessage(s3FileInfo.Bucket, s3FileInfo.Key, rawData === null ? "": rawData, error.message);
  SNSMessage.publishMessage(errorSNS).catch(err=> {
    console.error(err);
    if (reject){
      reject(err);
    }
  })
}

function readCSVFileByEvent(event, context, callback) {
  return new Promise(function(resolve, reject) {
    var allRowCount = 0;
    var executedRowNumber = 0;
    const srcBucket = event.Records[0].s3.bucket.name;
    const srcKey    = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    const typeMatch = srcKey.match(/\.([^.]*)$/);
    
    console.info('start handle s3 file, bucket:' + srcBucket + ', file name:' + srcKey);
    const params = {
      Bucket: srcBucket,
      Key: srcKey
    };
    if (!typeMatch) {
      const typeMatchError = new Error('Could not determine the csv type.');
      errorLog(typeMatchError, params, null, reject);
      return;
    }
    const csvType = typeMatch[1].toLowerCase();
    if (csvType != "csv") {
      const unsupportedTypeError = new Error('Unsupported csv type: ${csvType}');
      errorLog(unsupportedTypeError, params, reject);
      return;
    }  
    
    const readStream = s3.getObject(params).createReadStream();
    var options = { 'headers': true };
    csv
    .parseStream(readStream.on('error', accessError=>{
      errorLog(accessError, params, null, reject);
    }), options)
    .on('data', function(record) {
      console.info('each row data');
      console.info(record);
      
      if (typeof record.latitude === 'undefined' || typeof record.longitude === 'undefined' || typeof record.address === 'undefined') {
        const formatError = new Error("heads are not matched by standard");
        errorLog(formatError, params, record, reject);
        return;
      }

      if (record.latitude === '' || isNaN(record.latitude) || record.latitude === null) {
        errorLog(new Error('validation error, latitude can not be empty string or none number type'), params, record, null);
        return;
      }

      if (record.longitude === '' || isNaN(record.longitude) || record.longitude === null) {
        errorLog(new Error('validation error, longitude can not be empty string or none number type'), params, record, null);
        return;
      }

      if (record.address === '' || record.address === null) {
        errorLog(new Error('validation error, address can not be empty string or null'), params, record, null);
        return;
      }

      const position = new Position(record.latitude, record.longitude, record.address);
      Position.saveToDynamoDb(position, (err, data) => {
          if (err) {
            console.error(err);
            resolve(allRowCount);
            if (executedRowNumber === allRowCount) {
              resolve(allRowCount);
            }
          }
          else
          {
            console.info('data saved' + JSON.stringify(position));
            executedRowNumber++;
            if (executedRowNumber === allRowCount) {
              resolve(allRowCount);
            }
          }
          
      });
    })
    .on('headers', headers => {
      if (headers.length !== 3 && headers[0].toLowerCase() !== 'latitude' && headers[1].toLowerCase() !== 'longitude' && headers[2] !== 'address') {
        const headerError = new Error('Header format is not correct');
        errorLog(headerError, params, reject);
      }
    })
    .on('error', rowError => {
      errorLog(rowError, params, null, null);
    })
    .on('end', function(rowCount) {
      allRowCount = rowCount;
    });
  })
}