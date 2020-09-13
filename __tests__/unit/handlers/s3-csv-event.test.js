const AWS = require('aws-sdk-mock');
const path = require("path");

describe('Test s3Event', () => {
  const objectBody = '{"Test": "successfully put item in database"}';
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env.DYNAMODB_TABLE = 'Test';
    const getObjectResp = {
      Body: objectBody
    };
    AWS.mock('S3', 'getObject',  Buffer.from(require('fs').readFileSync(path.join(__dirname, "./test.csv"))));
    AWS.mock('SNS', 'publish', 'arn:aws:sns:eu-west-1:560566611276:CSVErrorMessage');
    AWS.mock('DynamoDB', 'putItem', function (params, callback){
      callback(null, getObjectResp);
      console.log(getObjectResp.Body);
    });
  });
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
  };
  afterAll(() => {
    AWS.restore();
  });
  
  test('should put data in database successfully', done => {
    AWS.remock('S3', 'getObject',  Buffer.from(require('fs').readFileSync(path.join(__dirname, "./test.csv"))));
    
    let handler = require('../../../src/handlers/s3-event.js');
    console.log = jest.fn();
    handler.readCSVFileByEvent(event,null, null).then(data => { 
      expect(console.log).toHaveBeenCalledWith(objectBody);
      done();
    })
  }, 30000),
  
  test('invalid data header', done => {
    AWS.mock('DynamoDB', 'putItem', function (params, callback){
    });
    AWS.remock('S3', 'getObject',  Buffer.from(require('fs').readFileSync(path.join(__dirname, "./invalidHeader.csv"))));
    AWS.mock('SNS', 'publish', 'arn:aws:sns:eu-west-1:560566611276:CSVErrorMessage');
    
    console.info = jest.fn();
    let handler = require('../../../src/handlers/s3-event.js');

    handler.readCSVFileByEvent(event,null, null).catch(err => { 
      expect(err).not.toBeNull();
      expect(err.code).toBe(1000);
      done();
    })
  }, 30000),

  test('error data header', done => {
    
    AWS.remock('S3', 'getObject',  Buffer.from(require('fs').readFileSync(path.join(__dirname, "./errorHeader.csv"))));
  
    let handler = require('../../../src/handlers/s3-event.js');
    handler.readCSVFileByEvent(event, null, null).catch(error => {
      expect(error).not.toBeNull();
      expect(error.code).toBe(1000);
      expect(error.message).toBe('Header format is not correct');
      done();
    }), 30000}),
  
    test('missing data', done => {
      AWS.remock('S3', 'getObject',  Buffer.from(require('fs').readFileSync(path.join(__dirname, "./missingData.csv"))));
      
      console.error = jest.fn();
      let handler = require('../../../src/handlers/s3-event.js');
      handler.readCSVFileByEvent(event, null, null).then(data => {
          expect(data).not.toBeNull();
          expect(console.error).toHaveBeenCalledWith("validation error, longitude can not be empty string or none number type");
          done();
      });
    }, 30000),
    
    test('invalid data', done => {
      AWS.remock('S3', 'getObject',  Buffer.from(require('fs').readFileSync(path.join(__dirname, "./invalidData.csv"))));
      
      console.error = jest.fn();
      let handler = require('../../../src/handlers/s3-event.js');
      handler.readCSVFileByEvent(event, null, null).then(data => {
        expect(data).not.toBeNull();
        expect(console.error).toHaveBeenCalledWith("validation error, longitude can not be empty string or none number type");
        done();
      });
    }, 30000),

    test('invalid file name', async done => {
      AWS.remock('S3', 'getObject',  Buffer.from(require('fs').readFileSync(path.join(__dirname, "./invalidData.csv"))));
      const event = {
        Records: [
          {
            s3: {
              bucket: {
                name: "test-bucket"
              },
              object: {
                key: "test-key.jpeg"
              }
            }
          }
        ]
      }
      console.error = jest.fn();
      let handler = require('../../../src/handlers/s3-event.js');
      handler.readCSVFileByEvent(event, null, null).catch(err => {
        expect(err).not.toBeNull();
        expect(err.code).toEqual(1002);
        expect(console.error).toHaveBeenCalledWith("Unsupported csv type: jpeg");
        done();
      });
    }, 30000),

    test('none extension name', async done => {
      AWS.remock('S3', 'getObject',  Buffer.from(require('fs').readFileSync(path.join(__dirname, "./invalidData.csv"))));
      const event = {
        Records: [
          {
            s3: {
              bucket: {
                name: "test-bucket"
              },
              object: {
                key: "test-key"
              }
            }
          }
        ]
      }
      console.error = jest.fn();
      let handler = require('../../../src/handlers/s3-event.js');
      handler.readCSVFileByEvent(event, null, null).catch(err => {
        expect(err).not.toBeNull();
        expect(err.code).toEqual(1003);
        expect(console.error).toHaveBeenCalledWith("Could not determine the csv type.");
        done();
      });
    }, 30000),
    
    test('mock S3 read failed', async done => {
      AWS.remock('S3', 'getObject', function(params, callback) {
        const err = new Error("read file from S3 failed");
        callback(err, null);
      });
      console.error = jest.fn();
      let handler = require('../../../src/handlers/s3-event.js');
      handler.readCSVFileByEvent(event, null, null).catch(err => {
        expect(err).not.toBeNull();
        expect(err.code).toEqual(1004);
        expect(console.error).toHaveBeenCalledWith("read file from S3 failed");
        done();
      });
    }, 30000),

    test('send SNS message failed', async done => {
      AWS.remock('SNS', 'publish', function(params, callback) {
        const err = new Error("send SNS message failed");
        callback(err, null);
      });
      AWS.remock('S3', 'getObject', function(params, callback) {
        const err = new Error("read file from S3 failed");
        callback(err, null);
      });
      console.error = jest.fn();
      let handler = require('../../../src/handlers/s3-event.js');
      handler.readCSVFileByEvent(event, null, null).catch(err => {
        expect(err).not.toBeNull();
        expect(err.code).toEqual(1005);
        expect(console.error).toHaveBeenCalledWith("read file from S3 failed");
        done();
      })
    }, 30000),

    test('putItem into dymanoDb failed', async done => {
      AWS.remock('S3', 'getObject',  Buffer.from(require('fs').readFileSync(path.join(__dirname, "./test.csv"))));
      AWS.remock('SNS', 'publish', 'arn:aws:sns:eu-west-1:560566611276:CSVErrorMessage');
      AWS.remock('DynamoDB', 'putItem', function(params, callback) {
        const err = new Error("putItem into dymanoDb failed");
        callback(err, null);
      });
      console.error = jest.fn();
      let handler = require('../../../src/handlers/s3-event.js');
      handler.readCSVFileByEvent(event, null, null).then(data => {
        expect(console.error).toHaveBeenCalledWith("putItem into dymanoDb failed");
        done();
      })
    }, 30000)
});
