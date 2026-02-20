# ⚡ AXIS — War Room
### Fill this in LIVE as you create each service tomorrow

> **Rule: Every URL, ARN, and name goes here immediately. Don't rely on memory.**

---

## AWS Account
```
Account ID:        [PASTE HERE]
Region:            us-east-1  ← NEVER CHANGE THIS
Login URL:         https://console.aws.amazon.com
```

---

## IAM
```
Role Name:         axis-lambda-role
Role ARN:          [PASTE HERE after creating]
```

---

## S3
```
Bucket Name:       axis-interviews-[YOURTEAMNAME]
Bucket ARN:        [PASTE HERE]
Bucket URL:        https://s3.console.aws.amazon.com/s3/buckets/[bucketname]
```

---

## DynamoDB
```
Table 1:           axis-interviews          Status: [ ] Active
Table 2:           axis-institutional-memory Status: [ ] Active
```

---

## Amazon Bedrock
```
Model ID:          anthropic.claude-3-5-sonnet-20241022-v2:0
Backup Model ID:   anthropic.claude-3-sonnet-20240229-v1:0
Access Status:     [ ] Requested  [ ] Granted
```

---

## Lambda Functions
```
Function 1:
  Name:            axis-scraper
  ARN:             [PASTE HERE]
  Timeout:         30 seconds
  Status:          [ ] Deployed  [ ] Tested

Function 2:
  Name:            axis-pipeline
  ARN:             [PASTE HERE]
  Timeout:         300 seconds (5 min)
  Status:          [ ] Deployed  [ ] Tested

Function 3:
  Name:            axis-interviewee
  ARN:             [PASTE HERE]
  Timeout:         30 seconds
  Status:          [ ] Deployed  [ ] Tested

Function 4:
  Name:            axis-debrief
  ARN:             [PASTE HERE]
  Timeout:         30 seconds
  Status:          [ ] Deployed  [ ] Tested
```

---

## API Gateway
```
API Name:          axis-api
API ID:            [PASTE HERE]
Stage:             prod
Invoke URL:        [PASTE HERE — this goes in App.js]

Endpoints:
  POST /scrape       [ ] Created  [ ] Tested
  POST /generate     [ ] Created  [ ] Tested
  GET  /brief/{id}   [ ] Created  [ ] Tested
  POST /interviewee/{id} [ ] Created  [ ] Tested
  POST /debrief/{id}     [ ] Created  [ ] Tested
```

---

## Amplify
```
App Name:          axis-frontend
App URL:           [PASTE HERE — share this with team]
Interviewee URL:   [App URL]/i/{interview_id}
Status:            [ ] Deployed  [ ] Tested
```

---

## Integration Checklist
```
[ ] Frontend calls API Gateway successfully
[ ] API Gateway triggers Lambda scraper
[ ] Scraper passes data to pipeline Lambda
[ ] Pipeline Lambda calls Bedrock (all 5 calls)
[ ] Brief saved to S3
[ ] Metadata saved to DynamoDB
[ ] Interviewee microsite loads at /i/{id}
[ ] Interviewee response saves to DynamoDB
[ ] Interviewer dashboard shows response notification
[ ] Full end-to-end test with H-E-B ✓
```

---

## Team Status Board (update every 45 min)
```
10:00 AM Check-in:
Person 2 (Pipeline):
Person 3 (Scraper/AWS):
Person 4 (Frontend):
Person 5 (Presentation):
Blockers:

11:00 AM Check-in:
Person 2 (Pipeline):
Person 3 (Scraper/AWS):
Person 4 (Frontend):
Person 5 (Presentation):
Blockers:

12:00 PM Check-in:
Person 2 (Pipeline):
Person 3 (Scraper/AWS):
Person 4 (Frontend):
Person 5 (Presentation):
What to cut if behind:

02:00 PM Check-in:
Integration working: Y/N
Demo path clear: Y/N
Backup video recorded: Y/N
```
