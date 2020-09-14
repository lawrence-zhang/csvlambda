const AWS = require('aws-sdk');
const uuid = require('node-uuid');
const dbb = new AWS.DynamoDB();
class Position {
    constructor(latitude, longitude, address) {
      this.latitude = Number(latitude);
      this.longitude = Number(longitude);
      this.address = address;
    }

    static async saveToDynamoDb(position) {
      var params = {
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
          'position_guid' : {S: uuid.v4()},
          'latitude' : {N: position.latitude.toString()},
          'longitude': {N: position.longitude.toString()},
          'address': {S: position.address}
        }
      };


      /*
      dbb.putItem(params, function(err, data) {
        callback(err, data);
      });*/
      return await dbb.putItem(params).promise();
    }
  };

  module.exports = Position;