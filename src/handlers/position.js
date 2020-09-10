const uuid = require('node-uuid');
const dbb = require('aws-sdk').DynamoDB();
class Position {
    constructor(latitude, longitude, address) {
      if (latitude === '' || isNaN(latitude) || latitude === null) {
        throw new Error('validation error, latitude can not be empty string or none number type')
      }

      if (longitude === '' || isNaN(longitude) || longitude === null) {
        throw new Error('validation error, longitude can not be empty string or none number type')
      }

      if (address === '' || address === null) {
        throw new Error('validation error, address can not be empty string or null');
      }

      this.latitude = Number(latitude);
      this.longitude = Number(longitude);
      this.address = address;
    }

    static saveToDynamoDb(position) {
      var params = {
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
          'position_guid' : {S: uuid.v4()},
          'position_data' : {S: JSON.stringify(position)}
        }
      };
    dbb.putItem(params, function(err, data) {
        if (err) {
          console.log("Error", err);
        }
      });    
    }
  };

  module.exports = Position;