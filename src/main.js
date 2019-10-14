const core = require('@actions/core');
const github = require('@actions/github');
const utilities = require('./utilities');
const exec = require('@actions/exec');


async function run() {
	try {
		core.info('Event name: ' + github.context.eventName);
		//core.info('Event payload: \n' + JSON.stringify(github.context.payload));

		// Download the UA
		const uaDownloadPath = 'https://wss-qa.s3.amazonaws.com/unified-agent/integration/wss-unified-agent-integration-763.jar';
		const uaJarName = 'wss-unified-agent.jar';
		await utilities.download2(uaDownloadPath, uaJarName);

		const wsDestinationUrl = '"' + core.getInput('ws-destination-url') + '"';
		const wsApiKey = core.getInput('ws-api-key');
		const wsUserKey = core.getInput('ws-user-key');
		const wsProjectKey = core.getInput('ws-project-key');

		let uaVars = [];
		const payload = github.context.payload;
		const packageType = payload.registry_package.package_type;
		// If the package type is docker - pull it
		if (packageType === 'docker') {
			
			// Docker version
			await exec.exec('docker', ['-v']);
		
			// List existing docker images
			await exec.exec('docker', ['images']);
			
			// Remove existing docker images
			await exec.exec('docker', ['rmi', '$(docker images -a -q)'])
			
			// Get the authenticated user of the gpr token
			const gprToken = core.getInput('gpr-token');
			const octokit = new github.GitHub(gprToken);
			const { data: user } = await octokit.users.getAuthenticated();
			const gprUser = user.login;
			console.log('gprUser: ' + gprUser);
		
			// Execute the docker login command
			await exec.exec('docker', ['login', 'docker.pkg.github.com', '-u', gprUser, '-p', gprToken]);

			// Create and execute the docker pull command
			const packageName = payload.registry_package.name;
			const packageVersion = payload.registry_package.package_version.version;
			const repositoryFullName = payload.repository.full_name;
			const packageUrl = 'docker.pkg.github.com/' + repositoryFullName + '/' + packageName + ':' + packageVersion;
			core.info('packageUrl: ' + packageUrl);
			await exec.exec('docker', ['pull', packageUrl]);
			
			// List existing docker images
			await exec.exec('docker', ['images']);
			
			uaVars = ['-jar', uaJarName,
					  '-d', '.',
					  '-wss.url', wsDestinationUrl,
					  '-apiKey', wsApiKey,
					  '-projectToken ', wsProjectKey,
					  '-noConfig', 'true',
					  '-generateScanReport', 'true',
					  '-"docker.scanImages"', 'true',
					  '-userKey', wsUserKey];
		// Else - the package type is not docker - download it
		} else {
			const downloadLink = payload.registry_package.package_version.package_files[0].download_url;
			const downloadName = payload.registry_package.package_version.package_files[0].name;
			await utilities.download2(downloadLink, downloadName);
			uaVars = ['-jar', uaJarName,
					  '-d', '.',
					  '-wss.url', wsDestinationUrl,
					  '-apiKey', wsApiKey,
					  '-projectToken ', wsProjectKey,
					  '-noConfig', 'true',
					  '-generateScanReport', 'true',
					  '-userKey', wsUserKey];
		}

		// List files in curr directory
		await exec.exec('ls', ['-alF']);

		// Run the UA
		await exec.exec('java', uaVars);
		
		// Get the location of the scan log file
		let result = '';
		const options = {listeners: {}};
		options.listeners.stdout = function(data) {
			result += data.toString();
		};
		await exec.exec('find', ['.', '-name', '"*scan_report.json"'], options);
		
		// Set the output parameters
		core.setOutput("scan-report-file-path", result);
		const folder = result.substr(0, result.lastIndexOf("/"));
		core.setOutput("scan-report-folder-path", folder);

		await exec.exec('cat', [result]);
	} catch (error) {
		core.setFailed(error.message);
	}
}

run();

// var scanPath = '';
// download('https://github.com/whitesource/unified-agent-distribution/releases/latest/download/wss-unified-agent.jar', "wss-unified-agent.jar", function (err) {
// utilities.download('https://wss-qa.s3.amazonaws.com/unified-agent/integration/wss-unified-agent-integration-763.jar', "wss-unified-agent.jar", function (err) {
    // try {
        // var dockerVersion = utilities.execShellCommand('docker -v');
        // dockerVersion.then(
            // result => {
                // core.info('Docker version is ' + result);
                // return utilities.execShellCommand('ls -alF');
                // // return utilities.execShellCommand('docker rmi $(docker images -a -q)');
            // }
        // ).then(
            // result => {
                // core.info('ls command output \n' + result);
                // const gprToken = core.getInput('gpr-token');
                // return utilities.execShellCommand('docker login docker.pkg.github.com -u whitesource-yossi -p ' + gprToken);
            // }
        // ).then(
            // result => {
                // core.info('Docker login result ' + result);
                // return utilities.execShellCommand('docker pull docker.pkg.github.com/whitesource-yossi/githubactiontesting2/localdjango:1.0');
            // }
        // ).then(
            // result => {
                // core.info('Docker pull results ' + result);
                // return utilities.execShellCommand('docker images');
            // }
        // ).then(
            // result => {
                // core.info('Docker images results ' + result);
                // const destinationUrl = core.getInput('ws-destination-url');
                // const wsApiKey = core.getInput('ws-api-key');
                // const wsUserKey = core.getInput('ws-user-key');
                // const wsProjectKey = core.getInput('ws-project-key');
                // return utilities.execShellCommand('java -jar wss-unified-agent.jar -d . -wss.url "' + destinationUrl + '" -apiKey ' + wsApiKey + ' -projectToken ' + wsProjectKey + ' -noConfig true -generateScanReport true -userKey ' + wsUserKey);
                // // return utilities.execShellCommand('java -jar wss-unified-agent.jar -d . -wss.url "' + destinationUrl + '" -apiKey ' + wsApiKey + ' -projectToken ' + wsProjectKey + ' -noConfig true -"docker.scanImages" true -generateScanReport true -userKey ' + wsUserKey);
            // }
        // ).then(
            // result => {
                // core.info('UA run results \n' + result);
                // // return utilities.execShellCommand('find "$(pwd -P)" -name "*scan_report.json"')
                // return utilities.execShellCommand('find -name "*scan_report.json"')
                // // return utilities.execShellCommand('find /home/runner/work/GitHubActionTesting2/GitHubActionTesting2/./whitesource/ -name "*scan_report.json"');
            // }
        // ).then(
            // result => {
                // scanPath = result;
                // core.info('Scan report path: ' + scanPath);
                // return utilities.execShellCommand('ls -alF ./whitesource');
            // }
        // ).then(
            // result => {
                // core.info('Second ls result \n' + result);

                // core.setOutput('scan-report-file-path', scanPath);
                // var n = scanPath.lastIndexOf('/');
                // var folder = scanPath.substr(0, n);
                // core.setOutput('scan-report-folder-path', folder);

                // let scanReport = fs.readFileSync(scanPath);
                // core.info('Scan report:\n' + JSON.stringify(scanReport));

                // // let isPrintScanReport = core.getInput('print-scan-report');
                // // if (isPrintScanReport === 'true') {
                // //     core.info('path: ' + result);
                // //     core.info('print scan true');
                // //     let scanReport = fs.readFileSync(scanPath);
                // //     core.info('Scan report:\n' + JSON.stringify(scanReport));
                // //     // return utilities.execShellCommand('cat "' + result +'"');
                // // } else {
                // //     core.info('print scan false');
                // // }
                // return {};
            // }
        // ).catch(err => {
            // core.error('Exception \n' + err);
        // });
    // } catch (error) {
        // core.setFailed(error.message);
    // }
// });