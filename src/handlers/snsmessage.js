const snsObj = require('aws-sdk').SNS();
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

    static publishMessage(snsmsg) {
        var params = {
            Message: JSON.stringify(snsmsg),
            TopicArn: SNSMessage.messageTopic()
        };

        // Create promise and SNS service object
        var publishTextPromise = snsObj.publish(params).promise();

        // Handle promise's fulfilled/rejected states
        publishTextPromise.then(
        function(data) {
            //console.log(`Message ${params.Message} send sent to the topic ${params.TopicArn}`);
        }).catch(
            function(err) {
            console.error(err, err.stack);
        });

    }
};

module.exports = SNSMessage;