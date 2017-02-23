var $fh = require('fh-mbaas-api');

const FORM_ID = process.env.FORM_ID;
const BACKEND_SERVICE_GUID = process.env.BACKEND_SERVICE_GUID;
const BACKEND_SERVICE_PATH = process.env.BACKEND_SERVICE_PATH || "/submissions";

console.log('BACKEND_SERVICE_GUID', BACKEND_SERVICE_GUID, 'BACKEND_SERVICE_PATH', BACKEND_SERVICE_PATH);

function persistSubmission(submission) {
    return new Promise(function(resolve, reject) {
      if (typeof BACKEND_SERVICE_GUID === 'undefined') {
        reject('Enviroment variable BACKEND_SERVICE_GUID not defined in Cloud App!');
        return;
      }

      var path = BACKEND_SERVICE_PATH;
      console.log('path: ' + path);

      $fh.service({
        "guid" : BACKEND_SERVICE_GUID, // The 24 character unique id of the service
        "path": path, //the path part of the url excluding the hostname - this will be added automatically
        "method": "POST",   //all other HTTP methods are supported as well. e.g. HEAD, DELETE, OPTIONS
        "timeout": 25000, // timeout value specified in milliseconds. Default: 60000 (60s)
        //"headers" : {
          // Custom headers to add to the request. These will be appended to the default headers.
        //}
        "params": submission
      }, function(err, body, response) {
        console.log('statuscode: ', response && response.statusCode);
        if (err) {
          // An error occurred during the call to the service. log some debugging information
          console.log(path + ' service call failed - err : ', err);
          reject(err)
        } else {
          //console.log(systemid + '/' + customerid + ' got response from service - status body : ', response.statusCode, body);
          resolve(body)
        }
      });
    });
}

//NodeJS Events Module. Note, this is required to register event emitter objects to forms.
var events = require('events');
var submissionEventListener = new events.EventEmitter();

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
  console.log('registering listener: submissionEventListener');
  if (err) return handleError(err);

  //submissionEventListener has now been registered with the $fh.forms Cloud API. Any valid Forms Events will now emit.
});
