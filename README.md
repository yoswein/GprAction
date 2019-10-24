# Whitesource GPR Security Action
This action is designed to run as part of the workflow "registry_package" [triggered event](https://help.github.com/en/github/automating-your-workflow-with-github-actions/events-that-trigger-workflows).

It scans the published/updated Docker image in GPR and reports back with found security vulnerabilities and license information.

## Input Parameters
**gpr-token**: GitHub personal access token with read/write privileges to GPR.

**ws-destination-url**: WhiteSource environment destination url.

**ws-api-key**: WhiteSource organization api key.

**ws-user-key**: WhiteSource user key.

**ws-product-key**: WhiteSource product key to publish results to.

**print-scan-report**: Whether to print the results report as part opf the action's log. Default is false.

**actions_step_debug**: Whether to print debug logs. Default is false.
@TODO should we provide more explanation + images about where to get the tokens and destination url?

## Output Parameters
**scan-report-file-path**: Path of the scan report file.

**scan-report-folder-path**: Path of the folder of the scan report file.


## Scan Report File
The output is a report in json format, which includes information on vulnerabilities, license, top fixes and inventory details. For example:
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
      "keyId": 11051440,
      "type": "REDHAT_PACKAGE_MODULE",
      "languages": "RPM",
      "references": {
        "url": "http://mirror.centos.org/centos/7/os/x86_64/Packages/sqlite-3.7.17-8.el7.x86_64.rpm",
        "homePage": "http://www.sqlite.org/",
        "genericPackageIndex": ""
      },
      "outdated": true,
      "matchType": "FILENAME",
      "outdatedModel": {
        "outdatedLibraryDate": "2015-11-20",
        "newestVersion": "3.26.0-4.fc29",
        "newestLibraryDate": "2019-07-23",
        "versionsInBetween": 14
      },
      "sha1": "6ecc54ef8743654c4f835b9d08924b1e69997ad5",
      "name": "sqlite-3.7.17-8.el7.x86_64.rpm",
      "artifactId": "sqlite-3.7.17-8.el7.x86_64.rpm",
      "version": "3.7.17-8.el7",
      "groupId": "sqlite",
      "licenses": [
        {
          "name": "Public Domain",
          "url": "http://creativecommons.org/licenses/publicdomain/",
          "profileInfo": {
            "copyrightRiskScore": "ONE",
            "patentRiskScore": "THREE",
            "copyleft": "NO",
            "linking": "NON_VIRAL",
            "royaltyFree": "NO"
          },
          "referenceType": "RPM (details available in package spec file)",
          "reference": "packageName\u003dsqlite\u0026url\u003dhttp://mirror.centos.org/centos/7/os/x86_64/Packages/sqlite-3.7.17-8.el7.x86_64.rpm"
        }
      ],
      "vulnerabilities": [
        {
          "name": "CVE-2018-8740",
          "type": "CVE",
          "severity": "MEDIUM",
          "score": 5.0,
          "cvss3_severity": "HIGH",
          "cvss3_score": 7.5,
          "scoreMetadataVector": "CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
          "publishDate": "2018-03-17",
          "url": "https://cve.mitre.org/cgi-bin/cvename.cgi?name\u003dCVE-2018-8740",
          "description": "In SQLite through 3.22.0, databases whose schema is corrupted using a CREATE TABLE AS statement could cause a NULL pointer dereference, related to build.c and prepare.c.",
          "allFixes": [],
          "references": []
        },
        {
          "name": "CVE-2019-8457",
          "type": "CVE",
          "severity": "HIGH",
          "score": 7.5,
          "cvss3_severity": "HIGH",
          "cvss3_score": 9.8,
          "scoreMetadataVector": "CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
          "publishDate": "2019-05-30",
          "url": "https://cve.mitre.org/cgi-bin/cvename.cgi?name\u003dCVE-2019-8457",
          "description": "SQLite3 from 3.6.0 to and including 3.27.2 is vulnerable to heap out-of-bound read in the rtreenode() function when handling invalid rtree tables.",
          "topFix": {
            "vulnerability": "CVE-2019-8457",
            "type": "UPGRADE_VERSION",
            "origin": "WHITESOURCE_EXPERT",
            "url": "https://www.sqlite.org/releaselog/3_28_0.html",
            "fixResolution": "Upgrade to version 3.28.0",
            "date": "2019-05-30",
            "message": "Upgrade to version"
          },
          "allFixes": [
            {
              "vulnerability": "CVE-2019-8457",
              "type": "UPGRADE_VERSION",
              "origin": "WHITESOURCE_EXPERT",
              "url": "https://www.sqlite.org/releaselog/3_28_0.html",
              "fixResolution": "Upgrade to version 3.28.0",
              "date": "2019-05-30",
              "message": "Upgrade to version"
            },
            {
              "vulnerability": "CVE-2019-8457",
              "type": "CHANGE_FILES",
              "origin": "GITHUB_COMMIT",
              "url": "https://github.com/sqlite/sqlite/commit/e41fd72acc7a06ce5a6a7d28154db1ffe8ba37a8#diff-bb7202195a039cb5588b2dacd3eda8a2",
              "fixResolution": "Replace or update the following files: manifest, manifest.uuid, rtree.c",
              "date": "2019-03-20",
              "message": "Enhance the rtreenode() function of rtree (used for testing) so that it\nuses the newer sqlite3_str object for better performance and improved\nerror reporting.\n\nFossilOrigin-Name: 90acdbfce9c088582d5165589f7eac462b00062bbfffacdcc786eb9cf3ea5377"
            }
          ],
          "references": []
        }
      ],
      "customAttributeValues": []
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
