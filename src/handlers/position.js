class Position {
    constructor(latitude, longitude, address) {
      this.latitude = Number(latitude);
      this.longitude = Number(longitude);
      this.address = address;
    }

    static saveToDynamoDb(position) {
      const AWS = require('aws-sdk');
      const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
      const uuid = require('node-uuid');
      var params = {
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
          'position_guid' : {S: uuid.v4()},
          'position_data' : {S: JSON.stringify(position)}
        }
      };
    ddb.putItem(params, function(err, data) {
        if (err) {
          console.log("Error", err);
        } else {
          console.log("Success", data);
        }
      });    
    }
  };

  module.exports = Position;