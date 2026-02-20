# AWS Setup Guide — Complete Step by Step
### Written for people who have never used AWS before

> ⚠️ ONE PERSON does all of this while sharing their screen.
> Everyone else watches and updates WAR_ROOM.md with every value created.

---

## Golden Rules
1. **ALWAYS use region: us-east-1** — set this before creating anything
2. **Copy every ARN/URL into WAR_ROOM.md immediately**
3. **Never close a tab until you've copied what you need**
4. **Do services in this exact order** — each depends on the previous

---

## ⏱ Estimated Setup Time: 45 minutes total

---

## STEP 1: Set Your Region (2 min)
1. Log into https://console.aws.amazon.com
2. Top-right corner — click the region dropdown
3. Select **US East (N. Virginia) — us-east-1**
4. ✅ Done — never change this

---

## STEP 2: IAM Role (5 min)
> Gives your Lambda functions permission to use other AWS services

1. Search **IAM** in top search bar → click it
2. Left sidebar → click **Roles**
3. Click **Create role** (top right, orange button)
4. Configure:
   ```
   Trusted entity type: AWS service
   Service: Lambda
   → Click Next
   ```
5. Search and add these permissions (search each one, check the box):
   ```
   ✓ AmazonBedrockFullAccess
   ✓ AmazonS3FullAccess
   ✓ AmazonDynamoDBFullAccess
   ✓ AWSLambdaBasicExecutionRole
   ✓ AmazonSESFullAccess
   → Click Next
   ```
6. Name it:
   ```
   Role name: axis-lambda-role
   → Click Create role
   ```
7. Click on **axis-lambda-role** in the list
8. Copy the **ARN** (looks like `arn:aws:iam::123456789:role/axis-lambda-role`)
9. **Paste ARN into WAR_ROOM.md**

---

## STEP 3: S3 Bucket (5 min)
> Stores all generated briefs and documents

1. Search **S3** → click it
2. Click **Create bucket** (orange button)
3. Configure:
   ```
   Bucket name: axis-interviews-[yourteamname]
   (Must be globally unique — add random numbers if it says "already exists")
   AWS Region: us-east-1
   ```
4. Under **Block Public Access settings**:
   ```
   UNCHECK "Block all public access"
   Check the acknowledgment checkbox that appears
   ```
5. Everything else: leave as default
6. Click **Create bucket**
7. **Paste bucket name into WAR_ROOM.md**

8. Click your bucket name → **Permissions** tab → scroll to **CORS** → Edit → paste:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }
   ]
   ```
9. Click **Save changes**

---

## STEP 4: DynamoDB Tables (5 min)
> Your database for storing interview data

1. Search **DynamoDB** → click it
2. Left sidebar → **Tables** → **Create table**

**Table 1:**
```
Table name: axis-interviews
Partition key: interview_id  (type: String)
Sort key: leave empty
Settings: Default settings
→ Click Create table
→ Wait for Status to show "Active" (30-60 seconds)
```

**Table 2:** Click **Create table** again
```
Table name: axis-institutional-memory
Partition key: sector  (type: String)
Sort key: interview_id  (type: String)
Settings: Default settings
→ Click Create table
```

✅ Both tables in WAR_ROOM.md

---

## STEP 5: Enable Amazon Bedrock (5 min + wait)
> ⚠️ DO THIS FIRST — approval takes a few minutes

1. Search **Bedrock** → click it
2. Left sidebar → **Model access**
3. Click **Modify model access** (top right)
4. Find and check:
   ```
   ✓ Claude 3.5 Sonnet  (under Anthropic)
   ✓ Claude 3 Sonnet    (under Anthropic) — backup
   ```
5. Click **Next** → **Submit**
6. Status will say "In Progress" — **keep this tab open**, refresh every 2 minutes
7. When it says **"Access granted"** → update WAR_ROOM.md ✅

> While waiting, continue with Step 6

---

## STEP 6: Lambda Functions (15 min)
> Your backend code that runs in the cloud

**Go to Lambda → Create function**

### Lambda #1: axis-scraper

```
Choose: Author from scratch
Function name: axis-scraper
Runtime: Python 3.12
Architecture: x86_64
Permissions: 
  → Expand "Change default execution role"
  → Use an existing role
  → Select: axis-lambda-role
→ Click Create function
```

**Set timeout:**
- Click **Configuration** tab → **General configuration** → Edit
- Timeout: **0 min 30 sec**
- Save

**Add code:**
- Click **Code** tab
- Delete ALL existing code
- Open `backend/lambda_scraper/lambda_function.py` from the repo
- Copy entire contents → paste into the Lambda editor
- Click **Deploy** (orange button)

**Test it:**
- Click **Test** tab → **Create new test event**
- Event name: `test-heb`
- Event JSON:
  ```json
  {
    "company_name": "H-E-B",
    "company_url": "https://www.heb.com"
  }
  ```
- Click **Test** → Should return scraped content ✅

---

### Lambda #2: axis-pipeline

**Create new function:**
```
Function name: axis-pipeline
Runtime: Python 3.12
Permissions: Use existing role → axis-lambda-role
→ Create function
```

**Set timeout:**
- Configuration → General configuration → Edit
- Timeout: **5 min 0 sec** ← CRITICAL
- Memory: **512 MB**
- Save

**Add code:**
1. Open `backend/lambda_pipeline/lambda_function.py`
2. Open `prompts/all_prompts.py`
3. Copy each prompt string from all_prompts.py
4. Paste into the corresponding prompt variable in lambda_function.py
5. Change `BUCKET_NAME = 'axis-interviews-YOURTEAMNAME'` to your actual bucket name
6. Copy entire file → paste into Lambda editor
7. Click **Deploy**

**Test it:**
- Test event:
  ```json
  {
    "company_name": "H-E-B",
    "scraped_content": "H-E-B is a Texas grocery chain founded in 1905 in San Antonio. Charles Butt is CEO. They have about 100,000 employees.",
    "tamu_notes": ""
  }
  ```
- Click Test → Should take 60-90 seconds → Returns brief ✅

---

### Lambda #3: axis-interviewee

```
Function name: axis-interviewee
Runtime: Python 3.12
Permissions: axis-lambda-role
Timeout: 30 seconds
```

Code: copy from `backend/lambda_interviewee/lambda_function.py`

---

### Lambda #4: axis-get-brief

```
Function name: axis-get-brief
Runtime: Python 3.12
Permissions: axis-lambda-role
Timeout: 30 seconds
```

Code: copy from `backend/lambda_debrief/lambda_function.py`
Change BUCKET_NAME to your actual bucket name.

---

## STEP 7: API Gateway (10 min)
> Creates the URLs your frontend calls

1. Search **API Gateway** → click it
2. Click **Create API**
3. Choose **REST API** → **Build**
4. Configure:
   ```
   Protocol: REST
   Create new API: New API
   API name: axis-api
   Endpoint Type: Regional
   → Create API
   ```

**Create resources and methods:**

For each endpoint below:
- Select the parent resource in the tree
- Actions → Create Resource → fill in name → ✓ Enable CORS → Create Resource
- Select the new resource → Actions → Create Method → select method → ✓
- Integration type: Lambda Function → select the Lambda → Save → OK

| Resource | Method | Lambda |
|----------|--------|--------|
| /scrape | POST | axis-scraper |
| /generate | POST | axis-pipeline |
| /brief/{id} | GET | axis-get-brief |
| /interviewee/{id} | POST | axis-interviewee |

**For path parameters like {id}:**
- Resource name: `{id}`
- This creates a path parameter

**Enable CORS on everything:**
- Click each resource
- Actions → Enable CORS
- Replace existing CORS headers → Yes, replace

**Deploy:**
- Actions → Deploy API
- Deployment stage: [New Stage]
- Stage name: `prod`
- → Deploy

**COPY THE INVOKE URL** → paste into WAR_ROOM.md
Looks like: `https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod`

---

## STEP 8: Amplify Frontend (5 min)
> Hosts your React web application

**On someone's laptop (must have Node.js installed):**

```bash
# If not already done:
npx create-react-app axis-frontend
cd axis-frontend
npm install axios react-router-dom

# Replace src/App.js with contents of frontend/src/App.js from repo
# IMPORTANT: Change API_URL at top of App.js to your API Gateway URL

npm run build
```

**In AWS Console:**
1. Search **Amplify** → click it
2. **Create new app**
3. Choose **Deploy without Git**
4. App name: `axis-frontend`
5. Drag and drop your **build** folder
6. Click **Save and deploy**
7. Wait ~2 minutes → copy your Amplify URL → WAR_ROOM.md ✅

---

## Final Integration Check

Go through WAR_ROOM.md integration checklist:
```
[ ] Open Amplify URL — see the AXIS home page
[ ] Type "H-E-B" and click Generate
[ ] Wait 60-90 seconds — brief should appear
[ ] Copy interviewee link — open in new tab
[ ] Toggle facts, select questions, submit
[ ] Return to brief page — should show "Interviewee responded"
```

If all checked: 🎉 You're ready to demo.
