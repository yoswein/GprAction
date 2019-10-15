const fs = require('fs');
const https = require('follow-redirects').https;
const core = require('@actions/core');

module.exports.download = function (url, dest) {
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

module.exports.findSingleFile = function (directory, endsWith) {
    return findSingleFileRecursive(directory, endsWith);
};

function findSingleFileRecursive (directory, endsWith) {
    core.info("test 1");
    let files = fs.readdirSync(directory);
    for(let i = 0; i < files.length; i++) {
        let filePath = directory + '/' + files[i];
        let stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            core.info("test 2");
            let fileName = findSingleFileRecursive(filePath, endsWith);
            core.info("test 3");
            if (fileName !== '') return fileName;
        } else if (filePath.endsWith(endsWith)) {
            return filePath;
        }
    }
    return '';
}