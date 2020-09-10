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
        var AWS = require('aws-sdk');
        
        var params = {
            Message: JSON.stringify(snsmsg),
            TopicArn: SNSMessage.messageTopic()
        };

        // Create promise and SNS service object
        var publishTextPromise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(params).promise();

        // Handle promise's fulfilled/rejected states
        publishTextPromise.then(
        function(data) {
            console.log(`Message ${params.Message} send sent to the topic ${params.TopicArn}`);
            console.log("MessageID is " + data.MessageId);
        }).catch(
            function(err) {
            console.error(err, err.stack);
        });

    }
};

module.exports = SNSMessage;