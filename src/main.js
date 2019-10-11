const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const utilities = require('./utilities');


console.log('Event name', github.context.eventName);
console.log('Event path', github.context.payload);

// download('https://github.com/whitesource/unified-agent-distribution/releases/latest/download/wss-unified-agent.jar', "wss-unified-agent.jar", function (err) {
utilities.download('https://wss-qa.s3.amazonaws.com/unified-agent/integration/wss-unified-agent-integration-763.jar', "wss-unified-agent.jar", function (err) {
    try {
        var dockerVersion = utilities.execShellCommand('docker -v');
        dockerVersion.then(
            result => {
                console.log('Docker version is ', result);
                // return utilities.execShellCommand('ls -alF');
                return utilities.execShellCommand('docker rmi $(docker images -a -q)');
            }
        ).then(
            result => {
                console.log('ls command output \n', result);
                const gprToken = core.getInput('gpr-token');
                return utilities.execShellCommand('docker login docker.pkg.github.com -u whitesource-yossi -p ' + gprToken);
            }
        ).then(
            result => {
                console.log('Docker login result ', result);
                return utilities.execShellCommand('docker pull docker.pkg.github.com/whitesource-yossi/githubactiontesting2/localdjango:1.0');
            }
        ).then(
            result => {
                console.log('Docker pull results ', result);
                return utilities.execShellCommand('docker images');
            }
        ).then(
            result => {
                console.log('Docker images results ', result);
                const destinationUrl = core.getInput('ws-destination-url');
                const wsApiKey = core.getInput('ws-api-key');
                const wsUserKey = core.getInput('ws-user-key');
                const wsProjectKey = core.getInput('ws-project-key');
                return utilities.execShellCommand('java -jar wss-unified-agent.jar -d . -wss.url "' + destinationUrl + '" -apiKey ' + wsApiKey + ' -projectToken ' + wsProjectKey + ' -noConfig true -generateScanReport true -userKey ' + wsUserKey);
            }
        ).then(
            result => {
                console.log('UA run results \n' + result);
                return utilities.execShellCommand('find . -name "*scan_report.json"')
            }
        ).then(
            result => {
                let isPrintScanReport = core.getInput('print-scan-report');
                if (isPrintScanReport === 'true') {
                    core.info('print scan true');
                    let scanReport = fs.readFileSync(result);
                    // core.info('Scan report:\n', JSON.stringify(scanReport));
                    core.info('Scan report:\n', scanReport);
                } else {
                    core.info('print scan false');
                }

                core.info('Scan report file path: ' + result);
                core.setOutput('scan-report-file-path', result);
                var n = result.lastIndexOf('/');
                var folder = result.substr(0, n);
                return core.setOutput('scan-report-folder-path', folder);
            }
        ).catch(err => {
            utilities.logCmdError("Exception ", err)
        });
    } catch (error) {
        core.setFailed(error.message);
    }
});