# ⚡ AXIS — Adaptive Interview Intelligence
### Texas A&M Hackathon 2026 | Built on Amazon Bedrock

---

## What AXIS Does

AXIS transforms cold business interviews into warm, insight-rich conversations.
An interviewer types a company name → 90 seconds later they have a complete
intelligence brief, structured interview questions with coaching, a pre-filled
Texas business intelligence schema, and a professional email to send the executive.

**No surveys. No effort from the interviewee. Just better conversations.**

---

## Key Design Decisions (Updated After Q&A with Levi)

| Decision | Reason |
|----------|--------|
| Removed interviewee survey | Levi confirmed: executives should do zero work |
| Info-only email to interviewee | Shows research depth, requires no action from exec |
| Added Document 4 Schema (Call 6) | This IS Levi's actual output — the knowledge graph |
| Post-interview debrief captures ground truth | Feeds institutional memory for next team |
| Demo company: GridFlex Energy (Case 001) | Most dramatic AI assumption correction moment |

---

## The 6-Call Bedrock Pipeline

```
Call 1: Research Synthesis      → Structured company profile from scraped data
Call 2: Texas Context           → ERCOT, deregulation, sector trends, institutional memory
Call 3: Interview Questions     → 10 questions with coaching + 5 preview for email
Call 4: Knowledge Gap Analysis  → What AI likely got wrong (warm opener for interview)
Call 5: Final Assembly          → Interviewer brief + interviewee info email
Call 6: Intelligence Schema     → Document 4 pre-fill for Texas knowledge graph ← NEW
```

---

## Application Flow

```
Interviewer types company name
        ↓
AXIS scrapes + runs 6 Bedrock calls (~90 seconds)
        ↓
INTERVIEWER BRIEF
  • What AI likely got wrong ← open interview with this
  • 10 questions + coaching rationale
  • Conversation flow guide
  • Knowledge gaps to fill
        ↓
INTELLIGENCE SCHEMA (Document 4)
  • Pre-filled by AI from public research
  • Interviewer completes remaining fields post-call
  • Saves to Texas A&M knowledge graph
        ↓
INTERVIEWEE INFO EMAIL
  • Zero effort required from executive
  • Shows research depth, builds credibility
  • Previews conversation topics only
        ↓
Interview happens
        ↓
Post-interview debrief (3 min)
  → What AI got wrong
  → Key insights learned
  → Questions that worked
  → Surprises
        ↓
Institutional memory updated
  → Next team in this sector starts smarter
```

---

## First 30 Minutes Tomorrow

```
1. Get QR code → ONE person logs into AWS → paste creds in WAR_ROOM.md
2. Set region: us-east-1 BEFORE ANYTHING ELSE
3. Everyone pulls repo: git clone https://github.com/abhishekp1703/AWS-TAMU-26.git
4. Person 3 opens infrastructure/setup_guide.md and starts immediately
5. First priority: request Bedrock model access (takes a few minutes to approve)
```

---

## Frontend Setup ✅ COMPLETE

The React frontend has been manually configured and is ready for development.

**Status**: ✅ Setup complete, build verified

**Quick Start**:
```bash
cd frontend
npm install    # Already done, but run if needed
npm start      # Start dev server on http://localhost:3000
npm run build  # Create production build
```

**What's Included**:
- React 18.2.0 with React Router DOM
- Manual setup (no CRA) using react-scripts
- Production build tested and working (72.39 kB gzipped)
- See `frontend/README.md` for detailed documentation

**Next Steps**:
1. Update `API_URL` in `frontend/src/App.js` with your API Gateway endpoint
2. Deploy to AWS Amplify or S3+CloudFront

---

## Team Assignments

| Person | Role | Files | First Task at 10AM |
|--------|------|-------|--------------------|
| Lead | Architecture + Integration | All | Wire services, unblock team |
| Person 2 | Bedrock Pipeline | backend/lambda_pipeline/ | Deploy pipeline Lambda with all 6 prompts |
| Person 3 | AWS Setup + Scraper | backend/lambda_scraper/, infrastructure/ | IAM → S3 → DynamoDB → Bedrock → scraper |
| Person 4 | Frontend | frontend/ | ✅ Setup complete — Update API_URL, deploy to Amplify |
| Person 5 | Presentation + Demo | presentation/ | Slides, GridFlex demo prep, backup video |

---

## Demo Company: GridFlex Energy (Case 001)

Why GridFlex: The AI made dramatically wrong assumptions — it assumed GridFlex
was a VPP battery operator. The founder corrects this immediately:
"We're a sales and marketing company." Perfect demo of the "what did AI get wrong?" opener.

```
Company:    GridFlex Energy
Sector:     Energy (ERCOT / VPP)
AI assumed: Battery operator / VPP infrastructure company
Reality:    Marketing and distribution layer — no hardware, no infrastructure
Real moat:  Trust, speed, brand equity in customer acquisition
Real constraint: Installer concentration (fulfillment, not demand)
Texas hook: ERCOT deregulation = 130+ REPs = structural unlock for new models
```

---

## Build Timeline Tomorrow

```
10:00  BUILD STARTS
11:30  Core pipeline working end-to-end
12:00  Lunch check-in
13:00  Frontend + schema tab + debrief tab working
14:00  Full integration test with GridFlex Energy
14:30  Polish + pre-load demo data
15:00  STOP BUILDING — practice only
15:30  Present and win
```

---

## If Things Break

| Problem | Fix |
|---------|-----|
| Bedrock timeout | Reduce max_tokens to 2000 |
| Lambda timeout | Configuration → increase to 300s |
| CORS error | Re-enable CORS in API Gateway → redeploy |
| Schema empty | Check Call 6 in Lambda logs — JSON parse may be failing |
| DynamoDB error | Verify axis-lambda-role has AmazonDynamoDBFullAccess |
