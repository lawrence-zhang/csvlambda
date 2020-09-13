const AWS = require('aws-sdk');
const snsObj = new AWS.SNS();
class SNSMessage {
    static messageTopic() {
        return process.env.CSV_ERROR_TOPIC;
    }
    constructor(s3Bucket, s3FileName, rawData, errorMsg) {
        this.s3Bucket = s3Bucket;
        this.s3FileName = s3FileName;
        this.rawData = rawData;
        this.errorMsg = errorMsg;
    }

    static async publishMessage(snsmsg, callback) {
        var params = {
            Message: JSON.stringify(snsmsg),
            TopicArn: SNSMessage.messageTopic()
        };
        
        return await snsObj.publish(params).promise();
    }
};

module.exports = SNSMessage;