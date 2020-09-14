const AWS = require('aws-sdk');
const Position = require('./position.js');
const SNSMessage = require('./snsmessage.js');
const s3 = new AWS.S3();
const csv = require('fast-csv');



exports.httpHandle = async (event, context, callback) => {
  
  await this.readCSVFileByEvent(event, context, callback).then(data => {
    var response = {
      "statusCode" : 200,
      "body": "service is running your request on backend, please check later"
    }
  
    callback(null, response);
  }).catch(ex => {
    var responseBody = {
      errorCode: ex.code,
      errorMsg: ex.message
    }
    var response;
    switch(ex.code) {
      case 2000:
      case 1003:
      case 1002:
      case 1004:
        response = {
          "statusCode": 400,
          "body": JSON.stringify(responseBody),
          "isBase64Encoded": false
        };
      break;
      default: {
        response = {
          "statusCode": 503,
          "body": JSON.stringify(responseBody),
          "isBase64Encoded": false
        }
      }
    }
    callback(null, response);
  });
};


function errorLog(error, params, rawData, reject) {
  console.error(error.message);
  const errorSNS = new SNSMessage(params == null ? '': params.Bucket, params == null ? '' : params.Key, rawData === null ? "": rawData, error.message);
  SNSMessage.publishMessage(errorSNS).then(data => {
    if (reject) {
      reject(error);
    }
  }).catch(err=> {
    console.error(err);
    if (reject){
      err.code = 1005;
      reject(err);
    }
  });
}

exports.readCSVFileByEvent = (event, context, callback) =>{
  return new Promise(function(resolve, reject) {

    if (event.queryStringParameters == null) {
      const bucketNotExists = new Error('bucket name could not be empty');
      
      bucketNotExists.code = 2000;
      errorLog(bucketNotExists, null, null, reject);
      return;
    }
    if (typeof event.queryStringParameters.bucket === 'undefined' || !event.queryStringParameters.bucket) {
      
      const bucketNotExists = new Error('bucket name could not be empty');
      bucketNotExists.code = 2000;
      errorLog(bucketNotExists, null, null, reject);
      return;
    }

    if(typeof event.queryStringParameters.filename === 'undefined' || !event.queryStringParameters.filename) {
      
      const filenameNotExists = new Error('file name could not be empty');
      filenameNotExists.code = 2000;
      errorLog(filenameNotExists, null, null, reject);
      return;
    }

    const params = {
      Bucket: event.queryStringParameters.bucket,
      Key: event.queryStringParameters.filename
    };
    s3.headObject(params).promise().then(data => {
     
    }).catch(err => {
      errorLog(err, params, null, reject);
    });
  
    var allRowCount = 0;
    var executedRowNumber = 0;
    const srcBucket = params.Bucket;
    const srcKey    = decodeURIComponent(params.Key.replace(/\+/g, " "));
    const typeMatch = srcKey.match(/\.([^.]*)$/);
    
    console.info('start handle s3 file, bucket:' + srcBucket + ', file name:' + srcKey);
   
    if (!typeMatch) {
      const typeMatchError = new Error('Could not determine the csv type.');
      typeMatchError.code = 1003;
      errorLog(typeMatchError, params, null, reject);
      return;
    }
    const csvType = typeMatch[1].toLowerCase();
    if (csvType != "csv") {
      const unsupportedTypeError = new Error('Unsupported csv type: ' + csvType);
      unsupportedTypeError.code = 1002;
      errorLog(unsupportedTypeError, params,null, reject);
      return;
    }  
    
    const readStream = s3.getObject(params, function(err, data) {
      if (err) {
        err.code = 1004;
        errorLog(err, params, null, reject);
      }
    }).createReadStream();


    var options = { 'headers': true };

    csv
    .parseStream(readStream.on('error', accessError=>{
      if(accessError.message == 'write after end') {
        errorLog(accessError, params, null, null);
      }
      else {
        errorLog(accessError, params, null, reject);
      }
      
    }), options)
    .on('data', async function(record) {
      console.info('each row data');
      console.info(record);
      
      if (typeof record.latitude === 'undefined' || typeof record.longitude === 'undefined' || typeof record.address === 'undefined') {
        const formatError = new Error("heads are not matched by standard");
        errorLog(formatError, params, record, reject);
        return;
      }

      if (record.latitude === '' || isNaN(record.latitude) || record.latitude === null) {
        executedRowNumber++;
        const validateError = new Error('validation error, latitude can not be empty string or none number type');
        validateError.code = 1001;
        errorLog(validateError, params, record, null);
        return;
      }

      if (record.longitude === '' || isNaN(record.longitude) || record.longitude === null) {
        executedRowNumber++;
        const validateError = new Error('validation error, longitude can not be empty string or none number type');
        validateError.code = 1001;
        errorLog(validateError, params, record, null);
        return;
      }

      if (record.address === '' || record.address === null) {
        executedRowNumber++;
        const validateError = new Error('validation error, address can not be empty string or null');
        validateError = 1001;
        errorLog(validateError, params, record, null);
        return;
      }

      const position = new Position(record.latitude, record.longitude, record.address);
      await Position.saveToDynamoDb(position).then(data => {
        
        executedRowNumber++;
        console.info('data saved' + JSON.stringify(position));
        if (executedRowNumber === allRowCount) {
          
          console.info('all data has been handled');
          resolve(allRowCount);
        }
      }).catch(err=> {
        
        errorLog(err, params, record, null);
            if (executedRowNumber === allRowCount) {
              console.info('all data has been handled');
              resolve(allRowCount);
            }
      });
      /*
      Position.saveToDynamoDb(position, (err, data) => {
          executedRowNumber++;
          if (err) {
            errorLog(err, params, record, null);
            if (executedRowNumber === allRowCount) {
              console.info('all data has been handled');
              resolve(allRowCount);
            }
          }
          else
          {
            console.info('data saved' + JSON.stringify(position));
            if (executedRowNumber === allRowCount) {;
              console.info('all data has been handled');
              resolve(allRowCount);
            }
          }
      });*/
    })
    .on('headers', headers => {
      if (headers.length !== 3 || headers[0].toLowerCase() !== 'latitude' || headers[1].toLowerCase() !== 'longitude' || headers[2] !== 'address') {
        const headerError = new Error('Header format is not correct');
        headerError.code = 1000;
        errorLog(headerError, params,null, reject);
      }
      else {
        console.log("head check passed");
      }
    })
    .on('error', rowError => {
      errorLog(rowError, params, null, null);
    })
    .on('end', function(rowCount) {
      if (allRowCount === 0 && executedRowNumber < rowCount) {
        allRowCount = rowCount;
      }
      else {
        if (executedRowNumber === rowCount) {
          resolve(rowCount);
        }
      }
    });
  })
}