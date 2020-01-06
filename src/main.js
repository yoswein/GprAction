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
		} else if (imageName == null || imageName.trim().length === 0) {
			core.setFailed('Invalid input: docker-image-identifier');
			return;
		}

		let imageNameParts = imageName.split(':');
		let regexFriendlyImageName;
		if (imageNameParts.length > 1) {
			regexFriendlyImageName = '.*' + imageNameParts[0] + '.*' + imageNameParts[1] + '.*';
		} else {
			regexFriendlyImageName = '.*' + imageName + '.*';
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
		let uaVars =
		   ['-jar', uaJarName,
			'-wss.url', wsDestinationUrl,
			'-apiKey', wsApiKey,
			'-generateScanReport', 'true',
			'-docker.scanImages', 'true',
			'-userKey', wsUserKey,
			'-project', imageNameParts[0]];

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
