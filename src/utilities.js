const fs = require('fs');
const nodeCmd = require('node-cmd');
const https = require('follow-redirects').https;
const core = require('@actions/core');

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

module.exports.download2 = function (url, dest) {
	return new Promise((resolve, reject) => {
		var file = fs.createWriteStream(dest);
		https.get(url, function (response) {
			response.pipe(file);
			file.on('finish', function () {
				file.close();
                core.info('Finished downloading file ' + url);
				resolve(dest);
			});
		}).on('error', function (err) { // Handle errors
            core.error('Failed downloading file ' + url);
			fs.unlink(dest);
			reject(err.message);
		});
    });
};

module.exports.execShellCommand = function (command) {
    return new Promise((resolve, reject) => {
        nodeCmd.get(command, (err, data, stderr) => {
            if (err) {
                reject(stderr);
            } else {
                resolve(data);
            }
        });
    });
};