const AWS = require('aws-sdk-mock');
const path = require("path");

describe('Test s3JsonLoggerHandler', () => {
  it('should read and log S3 objects', async () => {
    const objectBody = '{"Test": "successfully put item in database"}';
    const getObjectResp = {
      Body: objectBody
    };
    AWS.mock('DynamoDB', 'putItem', function (params, callback){
      callback(null, getObjectResp);
    });
    AWS.mock('S3', 'getObject',  Buffer.from(require('fs').readFileSync(path.join(__dirname, "./test.csv"))));
    AWS.mock('SNS', 'publish', 'arn:aws:sns:eu-west-1:560566611276:CSVErrorMessage');
    
    const event = {
      Records: [
        {
          s3: {
            bucket: {
              name: "test-bucket"
            },
            object: {
              key: "test-key.csv"
            }
          }
        }
      ]
    }

    console.info = jest.fn();
    let handler = require('../../../src/handlers/s3-event.js');
    
   
    handler.parseStream(event);
    
   
    expect(console.info).toHaveBeenCalledWith(objectBody);
    AWS.restore('S3');
    AWS.restore('SNS', 'publish');
    AWS.restore('DynamoDB', 'putItem');
  });
});
