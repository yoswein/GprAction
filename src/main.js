const core = require('@actions/core');
const github = require('@actions/github');
const utilities = require('./utilities');
const exec = require('@actions/exec');
const fs = require('fs');

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
		//const payload = github.context.payload;
        const payload = {"action":"published","registry_package":{"name":"empty_java_docker_3","package_type":"docker","package_version":{"version":"0.01"}},"repository":{"full_name":"whitesource/GitHubActionTesting1"}};
		const packageType = payload.registry_package.package_type;
		// If the package type is docker - pull it
		if (packageType === 'docker') {
			
			// Docker version
			await exec.exec('docker', ['-v']);
		
			// List existing docker images
			await exec.exec('docker', ['images']);

			let result = '';
			const options = {listeners: {}};
			options.listeners.stdout = function(data) {
				result += data.toString();
			};
			await exec.exec('docker', ['images', '-a', '-q'], options);
			result = result.replace(/(\r\n|\n|\r)/gm," ");

			// Remove all existing docker images
			await exec.exec('docker rmi ' + result);
			
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
			const packageUrl = 'docker.pkg.github.com/' + repositoryFullName.toLowerCase() + '/' + packageName + ':' + packageVersion;
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
					  '-docker.scanImages', 'true',
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
        let logFilePath = '';
        const logFileFolder = './whitesource/';
        let files = fs.readdirSync(logFileFolder);
        for(let i = 0; i < files.length; i++) {
            if (files[i].endsWith('scan_report.json')) {
                logFilePath = logFileFolder + files[i];
                break;
            }
        }

		// Set the output parameters
		core.setOutput('scan-report-file-path', logFilePath);
		core.setOutput('scan-report-folder-path', logFileFolder);

		// Print the log file if needed
        let isPrintScanReport = core.getInput('print-scan-report');
        if (isPrintScanReport === 'true') {
            core.info('print scan true');
            core.info('path: ' + logFilePath);
             let scanReport = fs.readFileSync(logFilePath, 'utf8');
             core.info('Scan report:\n' + scanReport);
         } else {
             core.info('print scan false');
         }
	} catch (error) {
		core.setFailed(error.message);
	}
}

run();