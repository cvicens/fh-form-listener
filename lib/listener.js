var events = require('events');
var $fh = require('fh-mbaas-api');

const BACKEND_SERVICE_GUID = process.env.BACKEND_SERVICE_GUID;
const BACKEND_SERVICE_PATH = process.env.BACKEND_SERVICE_PATH || "/submissions";

console.log('BACKEND_SERVICE_GUID', BACKEND_SERVICE_GUID, 'BACKEND_SERVICE_PATH', BACKEND_SERVICE_PATH);

function persistSubmission(submission) {
    return new Promise(function(resolve, reject) {
      if (typeof BACKEND_SERVICE_GUID === 'undefined') {
        reject('Enviroment variable BACKEND_SERVICE_GUID not defined in Cloud App!');
        return;
      }

      console.log('path: ' + BACKEND_SERVICE_PATH);
      $fh.service({
        "guid" : BACKEND_SERVICE_GUID,
        "path": BACKEND_SERVICE_PATH,
        "method": "POST",
        "timeout": 25000,
        "params": submission
      }, function(err, body, response) {
        console.log('statuscode: ', response && response.statusCode);
        if (err) {
          // An error occurred during the call to the service. log some debugging information
          console.log(path + ' service call failed - err : ', err);
          reject(err);
        } else {
          console.log('Got response from service - status body : ', response.statusCode, body);
          resolve(body);
        }
      });
    });
}

var submissionEventListener = new events.EventEmitter();
console.log('submissionEventListener', submissionEventListener);
submissionEventListener.on('submissionComplete', function(params){
  var submissionId = params.submissionId;
  var submissionCompletedTimestamp = params.submissionCompletedTimestamp;
  var submission = params.submission;
  submission.formName = params.submission.formSubmittedAgainst ?  params.submission.formSubmittedAgainst.name : 'N/A';
  console.log("Submission with ID " + submissionId + " has completed at " + submissionCompletedTimestamp);
  console.log("Submission: " + JSON.stringify(submission));
  persistSubmission(submission)
  .then(function (result) {
    console.log('submission sent correctly result:', result);
  })
  .catch(function (err) {
    console.error('Error while posting submission', err);
  });
});

submissionEventListener.on('submissionError', function(error){
  console.log("Error Submitting Form");
  console.log('error', JSON.stringify(error));
  console.log("Error Type: ", error.type);
});

$fh.forms.registerListener(submissionEventListener, function(err){
  console.log('registering listener: submissionEventListener err:', err);
  if (err) return handleError(err);
});
