const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const io = require('@actions/io');
const utilities = require('./utilities');


core.info('Event name ' + github.context.eventName);
core.info('Event path \n' + JSON.stringify(github.context.payload));
let scanPath = '';

// download('https://github.com/whitesource/unified-agent-distribution/releases/latest/download/wss-unified-agent.jar', "wss-unified-agent.jar", function (err) {
utilities.download('https://wss-qa.s3.amazonaws.com/unified-agent/integration/wss-unified-agent-integration-763.jar', "wss-unified-agent.jar", function (err) {
    try {
        var dockerVersion = utilities.execShellCommand('docker -v');
        dockerVersion.then(
            result => {
                core.info('Docker version is ' + result);
                return utilities.execShellCommand('ls -alF');
                // return utilities.execShellCommand('docker rmi $(docker images -a -q)');
            }
        ).then(
            result => {
                core.info('ls command output \n' + result);
                const gprToken = core.getInput('gpr-token');
                return utilities.execShellCommand('docker login docker.pkg.github.com -u whitesource-yossi -p ' + gprToken);
            }
        ).then(
            result => {
                core.info('Docker login result ' + result);
                return utilities.execShellCommand('docker pull docker.pkg.github.com/whitesource-yossi/githubactiontesting2/localdjango:1.0');
            }
        ).then(
            result => {
                core.info('Docker pull results ' + result);
                return utilities.execShellCommand('docker images');
            }
        ).then(
            result => {
                core.info('Docker images results ' + result);
                const destinationUrl = core.getInput('ws-destination-url');
                const wsApiKey = core.getInput('ws-api-key');
                const wsUserKey = core.getInput('ws-user-key');
                const wsProjectKey = core.getInput('ws-project-key');
                return utilities.execShellCommand('java -jar wss-unified-agent.jar -d . -wss.url "' + destinationUrl + '" -apiKey ' + wsApiKey + ' -projectToken ' + wsProjectKey + ' -noConfig true -generateScanReport true -userKey ' + wsUserKey);
                // return utilities.execShellCommand('java -jar wss-unified-agent.jar -d . -wss.url "' + destinationUrl + '" -apiKey ' + wsApiKey + ' -projectToken ' + wsProjectKey + ' -noConfig true -"docker.scanImages" true -generateScanReport true -userKey ' + wsUserKey);
            }
        ).then(
            result => {
                core.info('UA run results \n' + result);
                // return utilities.execShellCommand('find "$(pwd -P)" -name "*scan_report.json"')
                return utilities.execShellCommand('find -name "*scan_report.json"')
                // return utilities.execShellCommand('find /home/runner/work/GitHubActionTesting2/GitHubActionTesting2/./whitesource/ -name "*scan_report.json"');
            }
        ).then(
            result => {
                scanPath = result;
                core.info('Scan report path: ' + scanPath);
                return utilities.execShellCommand('ls -alF ./whitesource');
            }
        ).then(
            result => {
                core.info('Second ls result \n' + result);

                core.setOutput('scan-report-file-path', scanPath);
                var n = scanPath.lastIndexOf('/');
                var folder = scanPath.substr(0, n);
                core.setOutput('scan-report-folder-path', folder);

                let scanReport = fs.readFileSync(scanPath);
                core.info('Scan report:\n' + JSON.stringify(scanReport));

                // let isPrintScanReport = core.getInput('print-scan-report');
                // if (isPrintScanReport === 'true') {
                //     core.info('path: ' + result);
                //     core.info('print scan true');
                //     let scanReport = fs.readFileSync(scanPath);
                //     core.info('Scan report:\n' + JSON.stringify(scanReport));
                //     // return utilities.execShellCommand('cat "' + result +'"');
                // } else {
                //     core.info('print scan false');
                // }
                return {};
            }
        ).catch(err => {
            core.error('Exception \n' + err);
        });
    } catch (error) {
        core.setFailed(error.message);
    }
});