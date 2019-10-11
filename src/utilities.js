const fs = require('fs');
const nodeCmd = require('node-cmd');
const https = require('follow-redirects').https;

module.exports.download = function (url, dest, cb) {
    var file = fs.createWriteStream(dest);
    var request = https.get(url, function (response) {
        response.pipe(file);
        file.on('finish', function () {
            file.close(cb);
            console.log('Finished downloading file');
        });
    }).on('error', function (err) { // Handle errors
        fs.unlink(dest);
        if (cb) {
            cb(err.message);
        }
    });
};

module.exports.execShellCommand = function (command) {
    return new Promise((resolve, reject) => {
        nodeCmd.get(command, (err, data, stderr) => {
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

module.exports.logCmdError = function (message, error) {
    console.log(message + error)
};