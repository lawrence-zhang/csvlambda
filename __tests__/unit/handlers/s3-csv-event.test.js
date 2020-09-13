const AWS = require('aws-sdk-mock');
const path = require("path");

describe('Test s3Event', () => {
  const objectBody = '{"Test": "successfully put item in database"}';
  const OLD_ENV = process.env;

  beforeAll(() => {
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
    handler.parseStream(event, function(error, data) {
      expect(error).toBe(null);  
      expect(console.log).toHaveBeenCalledWith(objectBody);
      done();
    });
  }, 30000),
  test('invalid data header', done => {
    AWS.mock('DynamoDB', 'putItem', function (params, callback){
    });
    AWS.remock('S3', 'getObject',  Buffer.from(require('fs').readFileSync(path.join(__dirname, "./invalidHeader.csv"))));
    AWS.mock('SNS', 'publish', 'arn:aws:sns:eu-west-1:560566611276:CSVErrorMessage');
    
    console.info = jest.fn();
    let handler = require('../../../src/handlers/s3-event.js');
    handler.parseStream(event, function(error, data) {
      expect(error).not.toBe(null);  
      expect(error.code).toBe(1000);
      done();
    }); 
  }, 30000),
  test('error data header', done => {
    
    AWS.remock('S3', 'getObject',  Buffer.from(require('fs').readFileSync(path.join(__dirname, "./errorHeader.csv"))));
    
    
    console.info = jest.fn();
    let handler = require('../../../src/handlers/s3-event.js');
    handler.parseStream(event, function(error, data) {
      expect(error).not.toBe(null);  
      expect(error.code).toBe(1000);
      expect(error.message).toBe('heads are not matched by standard')
      done();
    }); 
  }, 30000),
  test('missing data', done => {
    AWS.remock('S3', 'getObject',  Buffer.from(require('fs').readFileSync(path.join(__dirname, "./missingData.csv"))));
    
    console.log = jest.fn();
    let handler = require('../../../src/handlers/s3-event.js');
    handler.parseStream(event, function(error, data) {
      if (data != null) {
        expect(data).toBe('finished');
        expect(console.log).toHaveBeenCalledWith("longitude validation error");
        done();
      }
      
    }); 
  }, 30000),
  test('invalid data', done => {
    AWS.remock('S3', 'getObject',  Buffer.from(require('fs').readFileSync(path.join(__dirname, "./invalidData.csv"))));
    
    console.log = jest.fn();
    let handler = require('../../../src/handlers/s3-event.js');
    handler.parseStream(event, function(error, data) {
      if (data != null) {
        expect(data).toBe('finished');
        expect(console.log).toHaveBeenCalledWith("longitude validation error");
        done();
      }
      
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
    handler.parseStream(event); 
    expect(console.error).toHaveBeenCalledWith("Unsupported csv type: jpeg");
    done();
  }),
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
    handler.parseStream(event); 
    expect(console.error).toHaveBeenCalledWith("Could not determine the csv type.");
    done();
  })
});
