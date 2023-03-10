var CLIENT_ID = '345897272217-k4vr48mf08cs2i03b4jss5bvliet27a9.apps.googleusercontent.com';
var API_KEY = 'AIzaSyCxkEAVIf9MtJyGlBBxT4akdyf2TJ83TRg';

var DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

var SCOPES = "https://www.googleapis.com/auth/drive";

function handleClientLoad() {
    gapi.load('client:auth2', initClient);
}

/**
*  Initializes the API client library and sets up sign-in state
*  listeners.
*/
function initClient() {
    gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
    }).then(function () {
        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

        // Handle the initial sign-in state.
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        
        //document.getElementById('authorize_button').onclick = handleAuthClick;
    }, function(error) {
        console.log(JSON.stringify(error, null, 2));
    });
}


function updateSigninStatus(isSignedIn) {
    if (!isSignedIn && document.getElementById('authorize_button')) {
        document.getElementById('authorize_button').style.display = 'block';
    }
}


function handleAuthClick(event) {
    gapi.auth2.getAuthInstance().signIn();
}

function getData() {
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: '1rvqnL7fjsv4vF_mwV4si3RmCJ-SY4bppda1aw6ZlWOM',
        range: 'Sheet1!Q1:S',
    }).then(function(response) {
        var range = response.result;
        if (range.values.length > 0) {
            for (i = 0; i < range.values.length; i++) {
                var row = range.values[i];
                //console.log(row)
            }
            set_data(range.values);
        } else {
            console.log('No data found.');
        }
    }, function(response) {
        console.log('Error: ' + response.result.error.message);
    });
}

function getPainting(id){
    id+=1
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: '1rvqnL7fjsv4vF_mwV4si3RmCJ-SY4bppda1aw6ZlWOM',
        range: 'Sheet1!A' + id + ':I' + id,
    }).then(function(response) {
        var range = response.result;
        if (range.values.length > 0) {
            for (i = 0; i < range.values.length; i++) {
                var row = range.values[i];
                console.log(row)
                formatResults(row);
            }
        } else {
            console.log('No data found.');
        }
    }, function(response) {
        console.log('Error: ' + response.result.error.message);
    });
}


function sendData(id, data){
    var params = {
        spreadsheetId: '1rvqnL7fjsv4vF_mwV4si3RmCJ-SY4bppda1aw6ZlWOM',
        range: "Sheet1!J" + id + ":L" + id,
        valueInputOption: "RAW",
      };

    var valueRangeBody = {
        "range": "Sheet1!J" + id + ":L" + id,
        "majorDimension": "COLUMNS",
        "values": [
            [data[0]], [data[1]], [data[2]]
        ]
      };

    var request = gapi.client.sheets.spreadsheets.values.update(params, valueRangeBody);
    request.then(function(response) {
        console.log("successful write!");
    }, function(reason) {
        console.error('error: ' + reason.result.error.message);
    });
}