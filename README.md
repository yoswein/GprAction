# Whitesource GPR Security Action
This action is designed to run as part of a workflow triggered by a "registry_package" event.

It scans the published GPR package and reports any security vulnerabilities found.

## Input Parameters
**gpr-token**: GitHub personal access token with read/write privileges to GPR.

**ws-destination-url**: WhiteSource environment destination url.

**ws-api-key**: WhiteSource organization api key.

**ws-user-key**: WhiteSource user key.

**ws-product-key**: WhiteSource product key to publish results to.

**print-scan-report**: Whether to print the results report as part opf the action's log. Default is false.

**actions_step_debug**: Whether to print debug logs. Default is false.


## Output Parameters
**scan-report-file-path**: Path of the scan report file.

**scan-report-folder-path**: Path of the folder of the scan report file.


## Scan Report File
The output is a report in json format, which includes information on vulnerabilities, policy violations, top fixes and inventory details. For example:
```json
{
  "projectVitals": {
    "productName": "fsa",
    "name": "fsa",
    "token": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "creationDate": "2017-06-17 07:12:29",
    "lastUpdatedDate": "2017-06-17 07:34:31"
  },
  "libraries": [
    {
      "keyUuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "keyId": 24559109,
      "name": "comm-2.0.3.jar",
      "artifactId": "comm-2.0.3.jar",
      "type": "MAVEN_ARTIFACT",
      "licenses": [],
      "vulnerabilities": [],
      "outdated": false,
      "matchType": "FILENAME"
    }
  ]
}
```

## Workflow Examples
The recommended way to add this action to your workflow, is with a subsequent action that upload the report json as an artifact. For example:
```yaml
on: registry_package
name: WORKFLOW_NAME
jobs:
  gprSecurityJob:
    name: GPR Security Check Job
    runs-on: ubuntu-latest
    steps:
      - name: GPR Security Check Step
        id: gpr-security-check
        uses: whitesource/GprSecurityAction@19.10.2
        with:
          gpr-token: ${{ secrets.GPR_ACCESS_TOKEN }}
          ws-api-key: ${{ secrets.WS_API_KEY }}
          ws-user-key: ${{ secrets.WS_USER_KEY }}
          ws-product-key: ${{ secrets.WS_PRODUCT_KEY }}
          ws-destination-url: https://saas.whitesourcesoftware.com/agent
      - name: Upload Report
        uses: actions/upload-artifact@master
        with:
          name: security-scan-log
          path: ${{ steps.gpr-security-check.outputs.scan-report-folder-path }}
```

Another option is to print the scan report to the step's log, without uploading it as an artifact:
```yaml
on: registry_package
name: WORKFLOW_NAME
jobs:
  gprSecurityJob:
    name: GPR Security Check Job
    runs-on: ubuntu-latest
    steps:
      - name: GPR Security Check Step
        id: gpr-security-check
        uses: whitesource/GprSecurityAction@19.10.2
        with:
          gpr-token: ${{ secrets.GPR_ACCESS_TOKEN }}
          ws-api-key: ${{ secrets.WS_API_KEY }}
          ws-user-key: ${{ secrets.WS_USER_KEY }}
          ws-product-key: ${{ secrets.WS_PRODUCT_KEY }}
          ws-destination-url: https://saas.whitesourcesoftware.com/agent
          print-scan-report: true
```
