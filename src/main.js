const fs = require('fs');
const core = require('@actions/core');
const github = require('@actions/github');
const exec = require('@actions/exec');
const utilities = require('./utilities');

async function run() {
	try {
		core.info('Event name: ' + github.context.eventName);

		// Get inputs
		const wsDestinationUrl = core.getInput('ws-destination-url');
		const wsApiKey = core.getInput('ws-api-key');
		const wsUserKey = core.getInput('ws-user-key');
		const wsProductKey = core.getInput('ws-product-key');
		const debugMode = core.getInput('actions_step_debug');
		const imageName = core.getInput('docker-image-identifier');
		const failOnPolicyViolations = core.getInput('fail-on-policy-violations');
		const uaJarName = 'wss-unified-agent.jar';
		// const uaDownloadPath = 'https://wss-qa.s3.amazonaws.com/unified-agent/integration/wss-unified-agent-integration-785.jar';
		const uaDownloadPath = 'https://github.com/whitesource/unified-agent-distribution/releases/latest/download/wss-unified-agent.jar'

		// Validate inputs
		if (wsApiKey == null || wsApiKey.trim().length < 20) {
			core.setFailed('Invalid input: ws-api-key');
			return;
		} else if (wsUserKey == null || wsUserKey.trim().length < 20) {
			core.setFailed('Invalid input: ws-user-key');
			return;
		} else if (wsDestinationUrl == null || wsDestinationUrl.trim().length === 0 ||
				   !wsDestinationUrl.startsWith('http') || !wsDestinationUrl.endsWith('/agent')) {
			core.setFailed('Invalid input: ws-destination-url');
			return;
		}

		let uaVars = [];
		if (imageName != null && imageName.trim().length > 0) {
			let imageNameParts = imageName.split(':');
			let regexFriendlyImageName;
			if (imageNameParts.length > 1) {
				regexFriendlyImageName = '.*' + imageNameParts[0] + '.*' + imageNameParts[1] + '.*';
			}
			let config =
				'checkPolicies=true\n' +
				'docker.includes=' + regexFriendlyImageName + '\n' +
				'includes=**/*.c **/*.cc **/*.cp **/*.cpp **/*.cxx **/*.c\\+\\+ **/*.h **/*.hh **/*.hpp **/*.hxx **/*.h\\+\\+ **/*.m **/*.mm **/*.pch **/*.c# **/*.cs **/*.csharp **/*.go **/*.goc **/*.js **/*.pl **/*.plx **/*.pm **/*.ph **/*.cgi **/*.fcgi **/*.pod **/*.psgi **/*.al **/*.perl **/*.t **/*.pl6 **/*.p6m **/*.p6l **/*.pm6 **/*.nqp **/*.6pl **/*.6pm **/*.p6 **/*.php **/*.py **/*.rb **/*.swift **/*.java **/*.clj **/*.cljx **/*.cljs **/*.cljc **/*.jar **/*.egg **/*.tar.gz **/*.tgz **/*.zip **/*.whl **/*.gem **/*.apk **/*.air **/*.dmg **/*.exe **/*.gem **/*.gzip **/*.msi **/*.nupkg **/*.swc **/*.swf **/*.tar.bz2 **/*.pkg.tar.xz **/*.(u)?deb **/*.(a)?rpm \n' +
				'excludes=' + uaJarName + '\n' +
				'updateType=OVERRIDE\n' +
				'updateInventory=true\n' +
				'forceUpdate=true\n' +
				'forceUpdate.failBuildOnPolicyViolation=false';
			fs.writeFileSync('wss-unified-agent.config', config);
			uaVars = ['-jar', uaJarName,
				'-wss.url', wsDestinationUrl,
				'-apiKey', wsApiKey,
				'-generateScanReport', 'true',
				'-docker.scanImages', 'true',
				'-userKey', wsUserKey,
				'-project', imageNameParts[0]];
		} else {
			const payload = github.context.payload;
			const packageType = payload.registry_package.package_type;
			core.info('Package type: ' + packageType);

			// If the package type is docker - pull it
			if (packageType === 'docker') {

				if (debugMode === 'true') {
					// Docker version
					await exec.exec('docker', ['-v']);

					// List existing docker images
					await exec.exec('docker', ['images']);
				}

				// Get the authenticated user of the gpr token
				const gpToken = core.getInput('gp-token');
				if (gpToken == null || gpToken.trim().length === 0) {
					core.setFailed('Invalid input: gp-token');
					return;
				}
				const octokit = new github.GitHub(gpToken);
				const {data: user} = await octokit.users.getAuthenticated();
				const gprUser = user.login;

				// Execute the docker login command
				await exec.exec('docker', ['login', 'docker.pkg.github.com', '-u', gprUser, '-p', gpToken]);

				// Create and execute the docker pull command
				const packageName = payload.registry_package.name;
				const packageVersion = payload.registry_package.package_version.version;
				const repositoryFullName = payload.repository.full_name;
				const packageUrl = 'docker.pkg.github.com/' + repositoryFullName.toLowerCase() + '/' + packageName + ':' + packageVersion;
				await exec.exec('docker', ['pull', packageUrl]);

				if (debugMode === 'true') {
					// List existing docker images
					await exec.exec('docker', ['images']);
				}

				uaVars = ['-jar', uaJarName,
					'-wss.url', wsDestinationUrl,
					'-apiKey', wsApiKey,
					'-noConfig', 'true',
					'-generateScanReport', 'true',
					'-docker.scanImages', 'true',
					'-docker.includeSingleScan', '.*' + packageName + '.*',
					'-userKey', wsUserKey,
					'-project', packageName];

				// Else - the package type is not docker - download it
			} else {
				// Download all package files
				for (let i = 0; i < payload.registry_package.package_version.package_files.length; i++) {
					let packageFile = payload.registry_package.package_version.package_files[i];
					let downloadLink = packageFile.download_url;
					let downloadName = packageFile.name;
					await utilities.download(downloadLink, downloadName);
				}
				uaVars = ['-jar', uaJarName,
					'-d', '.',
					'-wss.url', wsDestinationUrl,
					'-apiKey', wsApiKey,
					'-noConfig', 'true',
					'-generateScanReport', 'true',
					'-userKey', wsUserKey,
					'-project', payload.registry_package.name];
			}
		}

		if (wsProductKey != null && wsProductKey.trim().length > 20) {
			uaVars.push('-productToken', wsProductKey);
		}

		if (debugMode === 'true') {
			// List files in curr directory
			await exec.exec('ls', ['-alF']);
		}

		// Download the UA
		await utilities.download(uaDownloadPath, uaJarName);

		// Run the UA
		await exec.exec('java', uaVars);

		// Get the location of the scan log file
		let logFilePath = utilities.findSingleFile('./whitesource/', 'scan_report.json');
		let logFileFolder = logFilePath.substr(0, logFilePath.lastIndexOf('/'));

		// Set the output parameters
		core.setOutput('scan-report-file-path', logFilePath);
		core.setOutput('scan-report-folder-path', logFileFolder);

		// Print the log file if needed
        let isPrintScanReport = core.getInput('print-scan-report');
        if (isPrintScanReport === 'true') {
			core.info('Print scan report true');
            if (logFilePath.length > 0) {
				let scanReport = fs.readFileSync(logFilePath, 'utf8');
				core.info('Scan report:\n' + scanReport);
			} else {
				core.warning('Scan report does not exist!');
			}
         } else {
             core.info('Print scan report false');
         }

        // Fail if there are any policy violations
        if (failOnPolicyViolations === 'true') {
			if (logFilePath.length > 0) {
				let scanReport = fs.readFileSync(logFilePath, 'utf8');
				let scanReportJson = JSON.parse(scanReport);
				if (scanReportJson.policyStatistics.totalRejected > 0) {
					core.setFailed('Found ' + scanReportJson.policyStatistics.totalRejected + ' policy violations');
				} else {
					core.info('No policy violations found');
				}
			}
		}
	} catch (error) {
		core.setFailed(error.message);
	}
}

run();
