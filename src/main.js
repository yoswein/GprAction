const fs = require('fs');
const https = require('follow-redirects').https;
const core = require('@actions/core');
const cmd = require('node-cmd');

var download = function (url, dest, cb) {
    var file = fs.createWriteStream(dest);
    var request = https.get(url, function (response) {
        response.pipe(file);
        file.on('finish', function () {
            file.close(cb);  // close() is async, call cb after close completes.
            console.log('Finished downloading file');
        });
    }).on('error', function (err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        if (cb) {
            cb(err.message);
        }
    });
};

var execShellCommand = function (command) {
    return new Promise((resolve, reject) => {
        cmd.get(command, (err, data, stderr) => {
            if (err) {
                console.log("ERROR!!! " + stderr);
                console.log("ERROR 2!!! " + err);
                reject(stderr);
            } else {
                resolve(data);
            }
        });
    });
};

var logCmdData = function (data) {
    console.log('Cmd data', data)
};

var logCmdError = function (message, error) {
    console.log(message + error)
};

// download('https://github.com/whitesource/unified-agent-distribution/releases/latest/download/wss-unified-agent.jar', "wss-unified-agent.jar", function (err) {
download('https://wss-qa.s3.amazonaws.com/unified-agent/integration/wss-unified-agent-integration-763.jar', "wss-unified-agent.jar", function (err) {


    try {
        var dockerVersion = execShellCommand('docker -v');
        dockerVersion.then(
            result => {
                logCmdData(result);
                return execShellCommand('ls -alF');
            }
        ).then(
            result => {
                const gprToken = core.getInput('gpr-token');
                logCmdData(result);
                return execShellCommand('docker login docker.pkg.github.com -u whitesource-yossi -p ' + gprToken);
            }
        ).then(
            result => {
                logCmdData(result);
                return execShellCommand('docker pull docker.pkg.github.com/whitesource-yossi/githubactiontesting2/localdjango:1.0');
            }
        ).then(
            result => {
                logCmdData(result);
                return execShellCommand('docker images');
            }
        ).then(
            result => {
                const wsApiKey = core.getInput('ws-api-key');
                const wsUserKey = core.getInput('ws-user-key');
                const wsProjectKey = core.getInput('ws-project-key');
                logCmdData(result);
                return execShellCommand('java -jar wss-unified-agent.jar -d . -apiKey ' + wsApiKey + ' -projectToken ' + wsProjectKey + ' -noConfig true -generateScanReport true -userKey ' + wsUserKey);
            }
        ).then(
            result => {
                logCmdData(result);
                return execShellCommand('find . -name "*scan_report.json"')
            }
        ).then(
            result => {
                console.log('Scan report file path: ' + result);
                core.setOutput("scan-report-file-path", result);
                var n = result.lastIndexOf("/");
                var folder = result.substr(0, n);
                core.setOutput("scan-report-folder-path", folder);
                return "";
            }
        )
            .catch(err => {
                logCmdError("Exception ", err)
            });
    } catch (error) {
        core.setFailed(error.message);
    }
});