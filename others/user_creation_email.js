var aws = require('aws-sdk');

var ses = new aws.SES();

exports.handler = (event, context, callback) => {
    console.log(event);

    if (event.request.userAttributes.email) {
            sendEmail(event.request.userAttributes.email, 
              function(status) {
            // Return to Amazon Cognito
            callback(null, event);
        });
    } else {
        // Nothing to do, the user's email ID is unknown
        callback(null, event);
    }
};

function sendEmail(newUserEmail, completedCallback) {
    var eParams = {
        Destination: {
            ToAddresses: ["to_email"]
        },
        Message: {
            Body: {
                Text: {
                    Data: "A new user has signed up to the Ocean Archive. Their email is: " + newUserEmail
                }
            },
            Subject: {
                Data: "New Ocean Archive signup"
            }
        },

        // Replace source_email with your SES validated email address
        Source: "source_email"
    };

    let email = ses.sendEmail(eParams, function(err, data){
        if (err) {
            console.log(err);
        } else {
            console.log("===EMAIL SENT===");
        }
        completedCallback('Email sent');
    });
    console.log("EMAIL CODE END");
};
