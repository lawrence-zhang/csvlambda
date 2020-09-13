const AWS = require('aws-sdk');
const fs = require('fs');
const path = require("path");
const { start } = require('repl');
AWS.config.update({region: 'eu-west-1'});

async function countAllItems() {
    var scanParams = {
        TableName: process.env.DYNAMODB_TABLE,
        ProjectionExpression: 'address'
    };
    const dynamodb = new AWS.DynamoDB();
    return await dynamodb.scan(scanParams).promise();
        
}

describe('Integration Test For csv parsing for AWS', () => {
    
    test('success test including all process without SNS', async done => {
        var dynamodb = new AWS.DynamoDB();
        const s3 = new AWS.S3({apiVersion: '2006-03-01'});
        const fileStream = fs.createReadStream(path.join(__dirname, "./test.csv"));
        var uploadParams = {
            Bucket: process.env.Bucket_Name, 
            Key: 'lawrence.csv', Body: fileStream
        };
        
        var itemCountBefore = 0;
        console.log("1111");
        await countAllItems().then(data => {
            itemCountBefore = data.Count;
            console.log(itemCountBefore);
        });
        console.log("222");
        
        console.log('start upload');
        await s3.upload(uploadParams).promise().then(data=>{
            console.log('upload success');
        }).catch(e => {
            console.log(e);
        })
        await new Promise(r => setTimeout(r, 10000));
        var itemCountAfter = 0;
        await countAllItems().then(data => {
            itemCountAfter = data.Count;
            console.log(itemCountAfter);
        });
        expect(itemCountAfter > itemCountBefore).toEqual(true);
        done();
    }, 200000);

});