# AXIS — Adaptive Interview Intelligence
### Texas A&M Hackathon 2026 | Team War Room

---

## First 30 Minutes Tomorrow (READ THIS FIRST)

```
1. Get QR code → ONE person logs into AWS
2. Fill in WAR_ROOM.md with all credentials as you create services
3. Everyone else: pull this repo, open your assigned folder
4. Region: us-east-1 FOR EVERYTHING
5. Go in order: IAM → S3 → DynamoDB → Bedrock → Lambda → API Gateway → Amplify
```

---

##  Team Assignments

| Person | Role | Folder | First Task at 10AM |
|--------|------|--------|--------------------|
| **Lead** | Architecture + Integration | `/` | Wire all Lambdas together, monitor progress |
| **Person 2** | Bedrock Pipeline | `backend/lambda_pipeline` | Deploy lambda_pipeline.py to AWS |
| **Person 3** | Scraper + AWS Setup | `backend/lambda_scraper` | IAM → S3 → DynamoDB → deploy scraper |
| **Person 4** | Frontend | `frontend/` | `npm install` then paste App.js, deploy Amplify |
| **Person 5** | Presentation + Demo | `presentation/` | Polish slides, prep demo script, record backup video |

---

##  Repo Structure

```
AXIS/
├── README.md                        ← You are here
├── WAR_ROOM.md                      ← Paste ALL credentials here live
│
├── backend/
│   ├── lambda_scraper/
│   │   └── lambda_function.py       ← Deploy this to AWS Lambda
│   ├── lambda_pipeline/
│   │   └── lambda_function.py       ← Deploy this to AWS Lambda  
│   ├── lambda_interviewee/
│   │   └── lambda_function.py       ← Saves interviewee responses
│   └── lambda_debrief/
│       └── lambda_function.py       ← Post-interview debrief capture
│
├── prompts/
│   └── all_prompts.py               ← All 5 Bedrock prompts ready to paste
│
├── frontend/
│   └── src/
│       └── App.js                   ← Complete React app - just paste and deploy
│
├── infrastructure/
│   ├── setup_guide.md               ← Step by step AWS setup (no experience needed)
│   ├── api_routes.md                ← All 4 API endpoints documented
│   └── dynamodb_schema.md           ← Both table schemas
│
└── presentation/
    ├── demo_script.md               ← Word for word demo script
    ├── qa_questions.md              ← Questions to ask Levi at 9AM
    └── backup_plan.md               ← If live demo breaks
```

---

## Tomorrow's Build Timeline

```
08:30  Get credentials → fill WAR_ROOM.md
08:45  Listen to Levi (Person 3 starts IAM setup quietly)
09:00  Ask prepared Q&A questions (see presentation/qa_questions.md)
09:30  Watch AWS demo for shortcuts
10:00  BUILD STARTS — everyone knows their job
12:00  Lunch check-in: what's working, what do we cut?
01:00  Core pipeline must be working by now
02:00  Frontend + interviewee microsite done
02:30  Full integration test with H-E-B
03:00  STOP BUILDING — practice presentation only
03:30  Present and win
```

---

##  Demo Company: H-E-B Grocery

**Pre-load this before the demo so you're not waiting live:**
- Company: H-E-B Grocery Company
- Website: https://www.heb.com
- HQ: San Antonio, TX
- Founded: 1905
- CEO: Charles Butt
- Employees: ~100,000
- Revenue: $38B+
- Known for: Supply chain excellence, disaster response, Texas pride

---

## If Things Break

See `presentation/backup_plan.md` — record a screen video tonight as insurance.

**Quick fixes:**
| Problem | Fix |
|---------|-----|
| Bedrock timeout | Reduce max_tokens to 2000 |
| Lambda timeout | Configuration → increase to 300s |
| CORS error | Re-enable CORS in API Gateway, redeploy |
| Amplify not updating | Hard refresh Ctrl+Shift+R |
| DynamoDB permission | Check axis-lambda-role has DynamoDB policy |
