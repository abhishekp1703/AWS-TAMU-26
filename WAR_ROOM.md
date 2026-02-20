# ⚡ AXIS — War Room
### Fill this LIVE. Every URL and ARN goes here the moment you create it.

---

## AWS Account
```
Account ID:     [PASTE]
Region:         us-east-1  ← NEVER CHANGE THIS
Console:        https://console.aws.amazon.com
```

---

## IAM
```
Role Name:      axis-lambda-role
Role ARN:       [PASTE]
Policies:       AmazonBedrockFullAccess ✓  AmazonS3FullAccess ✓
                AmazonDynamoDBFullAccess ✓  AWSLambdaBasicExecutionRole ✓
```

---

## S3
```
Bucket Name:    axis-interviews-[YOURTEAMNAME]
CORS:           ✓ Configured
```

---

## DynamoDB
```
axis-interviews              [ ] Active
axis-institutional-memory    [ ] Active
```

---

## Amazon Bedrock
```
Primary:   anthropic.claude-3-5-sonnet-20241022-v2:0
Backup:    anthropic.claude-3-sonnet-20240229-v1:0
Status:    [ ] Requested   [ ] GRANTED ← pipeline won't work until granted
```

---

## Lambda Functions
```
axis-scraper        Timeout: 30s      [ ] Deployed  [ ] Tested
axis-pipeline       Timeout: 300s     [ ] Deployed  [ ] Tested (use GridFlex)
                    Memory: 512MB
                    BUCKET_NAME: updated ✓
                    All 6 prompts pasted ✓
axis-interviewee    Timeout: 30s      [ ] Deployed
axis-get-brief      Timeout: 30s      [ ] Deployed
                    BUCKET_NAME: updated ✓
```

---

## API Gateway
```
API Name:   axis-api
Stage:      prod
Invoke URL: [PASTE HERE → goes into App.js line 4]

POST /scrape           [ ] Created  [ ] Tested
POST /generate         [ ] Created  [ ] Tested
GET  /brief/{id}       [ ] Created  [ ] Tested
POST /debrief/{id}     [ ] Created  [ ] Tested
CORS on all routes:    [ ] Done
Deployed to prod:      [ ] Done
```

---

## Amplify
```
App URL:              [PASTE → share with team]
API_URL in App.js:    [ ] Updated
Rebuilt after update: [ ] Done
Status:               [ ] Deployed  [ ] Home page loads
```

---

## GridFlex Demo Pre-Load
```
GridFlex interview_id: [PASTE after generating]
Brief tab:             [ ] Shows brief with "What AI Got Wrong" section
Schema tab:            [ ] Document 4 schema populated
Email tab:             [ ] Info email shows (no survey)
Post-Interview tab:    [ ] Debrief saved, shows "Complete"
Interviewee page:      [ ] /i/[id] loads, shows info only, no survey
```

---

## Full Integration Test (Run Before Presenting)
```
[ ] Open Amplify URL → home page loads
[ ] Type GridFlex Energy → brief generates in ~90s
[ ] Brief tab: ⚠️ What AI Got Wrong section visible
[ ] Schema tab: Document 4 pre-filled, orange "verify" fields showing
[ ] Email tab: info email copy works, no survey elements
[ ] /i/[id]: opens in new tab, shows info page, no toggles
[ ] Post-Interview: fill debrief → save → "Complete" message
All 7: 🎉 READY
```

---

## Status Updates (Every 45 Min)
```
10:00 AM — Person 2 (Pipeline): | Person 3 (AWS): | Person 4 (Frontend): | Blockers:
11:00 AM — Person 2: | Person 3: | Person 4: | Blockers:
12:00 PM — Pipeline E2E: Y/N | Frontend: Y/N | Schema tab: Y/N | Cut if behind:
02:00 PM — Full demo: Y/N | Backup video: Y/N | Slides final: Y/N
```
debrief_completed: [ ] Shows Complete
