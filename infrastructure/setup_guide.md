# AWS Workshop Studio — Complete Setup Guide
### Written specifically for AWS-provided hackathon accounts

> ⚠️ ONE PERSON shares screen and does all AWS setup.
> Everyone else watches and updates WAR_ROOM.md with every value created.
> Estimated total time: 45 minutes

---

## PART 0: Accessing Your Workshop Account (First 5 Minutes)

### Step 1: Open the Workshop Portal
1. Go to **https://catalog.workshops.aws**
2. Click **"Get started"** or **"Sign in"**
3. You will see a QR code or a 12-character event access code on your hackathon check-in sheet
4. Enter the event code OR scan the QR code
5. Click **"Accept Terms & Login"**
6. Click **"Open AWS Console"**

> ⚠️ You will land directly inside a pre-provisioned AWS account.
> You do NOT need to create an account or enter a credit card.
> The account has a spending limit set by the organizers.

### Step 2: Verify You're In the Right Account
Once the AWS Console opens:
- Top right corner shows an account name like **"WSParticipantRole"** or **"TeamRole"**
- This is normal — it's your workshop account
- **DO NOT** try to log in with a personal AWS account

### Step 3: Set Your Region — Do This Before Anything Else
1. Top-right corner — click the region dropdown (shows current region name)
2. Select **US East (N. Virginia) — us-east-1**
3. Page reloads — confirm it shows **N. Virginia** in the top right
4. ✅ Every service you create must be in this region

### Step 4: Check What's Pre-Provisioned
Some workshop accounts come with services already set up.
Before creating anything, quickly check:

- Search **IAM** → Roles → look for any role with "axis", "lambda", or "workshop" in the name
- Search **S3** → check if any buckets already exist
- Search **Bedrock** → Model access → check if Claude models are already approved

**Paste anything you find into WAR_ROOM.md immediately.**
If Claude models are already approved, skip the Bedrock step below — saves 5 minutes.

---

## PART 1: IAM Role (5 minutes)
> This gives your Lambda functions permission to call Bedrock, S3, and DynamoDB.

1. Search **IAM** in top search bar → click **IAM**
2. Left sidebar → **Roles** → **Create role** (orange button, top right)

**Page 1 — Select trusted entity:**
```
Trusted entity type: AWS service
Use case: Lambda
→ Click Next
```

**Page 2 — Add permissions:**
Search and check each one:
```
✓ AmazonBedrockFullAccess
✓ AmazonS3FullAccess
✓ AmazonDynamoDBFullAccess
✓ AWSLambdaBasicExecutionRole
✓ AmazonSESFullAccess
→ Click Next
```

**Page 3 — Name and create:**
```
Role name: axis-lambda-role
→ Click Create role
```

**After creation:**
- Click **axis-lambda-role** in the list
- Copy the **ARN** at the top (looks like `arn:aws:iam::123456789012:role/axis-lambda-role`)
- Paste into WAR_ROOM.md

> ⚠️ Workshop accounts sometimes restrict IAM. If you get a permissions error:
> Look for an existing role like "LabRole" or "WSParticipantRole" in the Roles list.
> Use that role instead — it usually already has broad permissions.
> Just update the role name in WAR_ROOM.md.

---

## PART 2: S3 Bucket (5 minutes)
> Stores all generated briefs, emails, and schemas.

1. Search **S3** → **Create bucket** (orange button)

**Configure:**
```
Bucket name: axis-interviews-[your-team-name]
  (Must be globally unique — add numbers if it says name already taken)
AWS Region: us-east-1
```

**Block Public Access:**
```
UNCHECK "Block all public access"
✓ Check the acknowledgment box that appears
```

Everything else — leave as default → **Create bucket**

**Add CORS (required for frontend):**
- Click your bucket name → **Permissions** tab
- Scroll to **Cross-origin resource sharing (CORS)** → **Edit**
- Paste this exactly:

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
- **Save changes**
- Paste bucket name into WAR_ROOM.md ✅

---

## PART 3: DynamoDB Tables (5 minutes)
> Your database for interviews and institutional memory.

1. Search **DynamoDB** → Left sidebar → **Tables** → **Create table**

**Table 1:**
```
Table name:      axis-interviews
Partition key:   interview_id    (type: String)
Sort key:        leave empty
Settings:        Default settings
→ Create table
→ Wait ~30 seconds until Status = Active
```

**Table 2:** Click Create table again:
```
Table name:      axis-institutional-memory
Partition key:   sector          (type: String)
Sort key:        interview_id    (type: String)
Settings:        Default settings
→ Create table
```

Both tables confirmed in WAR_ROOM.md ✅

---

## PART 4: Amazon Bedrock — Request Model Access (5 min + wait)
> ⚠️ DO THIS IMMEDIATELY — approval can take 2-5 minutes.
> Request it now, continue setup while you wait.

1. Search **Bedrock** → click **Amazon Bedrock**
2. Left sidebar → **Model access** (scroll down to find it)
3. Click **Modify model access** (top right button)
4. Find **Anthropic** section — check both:
   ```
   ✓ Claude 3.5 Sonnet
   ✓ Claude 3 Sonnet    ← backup
   ```
5. Click **Next** → **Submit**
6. Status shows "In Progress" — **keep this tab open**
7. Refresh every 2 minutes until it says **"Access granted" ✅**

> ⚠️ Workshop accounts sometimes have Bedrock pre-approved.
> If you see "Access granted" already — skip this step entirely.

> ⚠️ If you don't see a "Modify model access" button:
> The workshop account may have a different Bedrock setup.
> Ask an AWS engineer at the hackathon — this is a common workshop config question.

---

## PART 5: Lambda Functions (20 minutes)
> Your backend code that runs in the cloud. Create 4 functions.

### How to Create Each Lambda (same steps for all 4):

**Go to Lambda:**
1. Search **Lambda** → **Create function**
2. Choose **"Author from scratch"**
3. Fill in the config (see each function below)
4. Under **Permissions** → expand **"Change default execution role"**
   → Select **"Use an existing role"**
   → Choose **axis-lambda-role** (or the workshop LabRole if IAM was restricted)
5. Click **Create function**
6. Paste code from the repo
7. Click **Deploy** (orange button in code editor)
8. Set timeout in **Configuration** tab

---

### Lambda #1: axis-scraper

**Create with:**
```
Function name: axis-scraper
Runtime:       Python 3.12
Architecture:  x86_64
Role:          axis-lambda-role
```

**Set timeout:**
- Configuration tab → General configuration → Edit
- Timeout: **0 min 30 sec** → Save

**Add code:**
- Code tab → delete all existing code
- Open `backend/lambda_scraper/lambda_function.py` from the repo
- Copy entire contents → paste → **Deploy**

**Test it:**
- Test tab → Create new test event
- Event name: `test-gridflex`
- JSON:
```json
{
  "company_name": "GridFlex Energy",
  "company_url": "https://www.gridflex.com"
}
```
- Click **Test** → should return scraped content within 30 seconds ✅

---

### Lambda #2: axis-pipeline (Most Important)

**Create with:**
```
Function name: axis-pipeline
Runtime:       Python 3.12
Architecture:  x86_64
Role:          axis-lambda-role
```

**Set timeout and memory — CRITICAL:**
- Configuration → General configuration → Edit
- Timeout: **5 min 0 sec**
- Memory: **512 MB**
- Save

**Add code (3 steps):**

Step 1: Open `backend/lambda_pipeline/lambda_function.py` from repo

Step 2: Open `prompts/all_prompts.py` from repo in a separate tab

Step 3: In the pipeline file, find these 6 placeholder lines:
```python
SYNTHESIS_PROMPT = """[PASTE SYNTHESIS_PROMPT HERE]"""
TEXAS_PROMPT = """[PASTE TEXAS_PROMPT HERE]"""
QUESTIONS_PROMPT = """[PASTE QUESTIONS_PROMPT HERE]"""
GAPS_PROMPT = """[PASTE GAPS_PROMPT HERE]"""
ASSEMBLY_PROMPT = """[PASTE ASSEMBLY_PROMPT HERE]"""
SCHEMA_PROMPT = """[PASTE SCHEMA_PROMPT HERE]"""
```

Replace each `[PASTE X HERE]` with the actual prompt string from all_prompts.py
(copy from the triple-quote start to the triple-quote end for each prompt)

Step 4: Change the bucket name:
```python
# Find this line:
BUCKET_NAME = 'axis-interviews-YOURTEAMNAME'
# Change to your actual bucket name:
BUCKET_NAME = 'axis-interviews-[your-team-name]'
```

Step 5: Paste entire file → **Deploy**

**Test it:**
```json
{
  "company_name": "GridFlex Energy",
  "scraped_content": "GridFlex Energy is a Texas-based virtual power plant company operating in the ERCOT market. They work with residential battery systems and solar installations. Based in Texas.",
  "tamu_notes": ""
}
```
Click Test → takes 60-90 seconds → should return a brief with interview_id ✅

---

### Lambda #3: axis-interviewee

**Create with:**
```
Function name: axis-interviewee
Runtime:       Python 3.12
Timeout:       30 seconds
Role:          axis-lambda-role
```

Code: copy from `backend/lambda_interviewee/lambda_function.py` → Deploy ✅

---

### Lambda #4: axis-get-brief

**Create with:**
```
Function name: axis-get-brief
Runtime:       Python 3.12
Timeout:       30 seconds
Role:          axis-lambda-role
```

Code: copy from `backend/lambda_debrief/lambda_function.py`

**Change bucket name before deploying:**
```python
BUCKET_NAME = 'axis-interviews-[your-team-name]'
```

Deploy ✅

---

## PART 6: API Gateway (10 minutes)
> Creates the HTTPS URLs your frontend calls.

1. Search **API Gateway** → **Create API**
2. Choose **REST API** → **Build**

```
Protocol:         REST
Create new API:   New API
API name:         axis-api
Endpoint Type:    Regional
→ Create API
```

### Create the 4 Endpoints

For each endpoint, the pattern is:
> Root (/) → Create Resource → Create Method → Link to Lambda

**Endpoint 1: POST /scrape**
- Click "/" in the resource tree
- Actions → Create Resource
  ```
  Resource Name: scrape
  ✓ Enable API Gateway CORS
  → Create Resource
  ```
- With /scrape selected → Actions → Create Method → POST → ✓
  ```
  Integration type: Lambda Function
  Lambda Region: us-east-1
  Lambda Function: axis-scraper
  → Save → OK (grant permission popup)
  ```

**Endpoint 2: POST /generate**
- Click "/" → Actions → Create Resource
  ```
  Resource Name: generate
  ✓ Enable API Gateway CORS
  ```
- /generate → Create Method → POST → Lambda: axis-pipeline

**Endpoint 3: GET /brief/{id}**
- Click "/" → Create Resource → name: `brief`
- Click /brief → Create Resource
  ```
  Resource Name: {id}
  Resource Path: {id}
  ✓ Enable API Gateway CORS
  ```
- Click /{id} → Create Method → GET → Lambda: axis-get-brief

**Endpoint 4: POST /debrief/{id}**
- Click "/" → Create Resource → name: `debrief`
- Click /debrief → Create Resource → name: `{id}` ✓ Enable CORS
- Click /{id} → Create Method → POST → Lambda: axis-get-brief
  (same Lambda handles both GET brief and POST debrief)

### Enable CORS on Everything
For each resource (/scrape, /generate, /brief/{id}, /debrief/{id}):
- Click the resource
- Actions → Enable CORS
- Click **Enable CORS and replace existing CORS headers**
- Click **Yes, replace existing values**

### Deploy the API
- Actions → Deploy API
  ```
  Deployment stage: [New Stage]
  Stage name: prod
  → Deploy
  ```
- **COPY THE INVOKE URL** → paste into WAR_ROOM.md immediately
- Looks like: `https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod`

---

## PART 7: Frontend on Amplify (10 minutes)

### On one team member's laptop:

**Step 1: Verify Node.js is installed**
```bash
node --version   # should show v16+ 
npm --version    # should show 8+
```
If not installed: download from https://nodejs.org (LTS version)

**Step 2: Create React app (skip if done last night)**
```bash
npx create-react-app axis-app
cd axis-app
npm install axios react-router-dom
```

**Step 3: Replace App.js**
```bash
# Clone/pull the repo if not already done
git clone https://github.com/abhishekp1703/AWS-TAMU-26.git

# Copy the App.js from repo to your React app
cp AWS-TAMU-26/frontend/src/App.js axis-app/src/App.js
```

**Step 4: Set your API URL**

Open `axis-app/src/App.js` in any text editor
Find line 4:
```javascript
const API_URL = 'YOUR_API_GATEWAY_URL_HERE';
```
Replace with your actual API Gateway URL from WAR_ROOM.md:
```javascript
const API_URL = 'https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod';
```
Save the file.

**Step 5: Build**
```bash
cd axis-app
npm run build
# Takes about 60 seconds
# Creates a 'build' folder when done
```

**Step 6: Deploy to Amplify**
1. In AWS Console → Search **Amplify** → click it
2. Click **Create new app**
3. Choose **Deploy without Git**
4. App name: `axis-frontend`
5. Drag and drop your entire **build** folder into the upload box
6. Click **Save and deploy**
7. Wait ~2 minutes
8. Copy your app URL (looks like `https://main.abc123.amplifyapp.com`)
9. Paste into WAR_ROOM.md ✅

---

## PART 8: Final Integration Test

Run through this checklist before anyone starts on slides:

```
□ Open your Amplify URL — AXIS home page loads
□ Type "GridFlex Energy" + any URL → click Generate
□ Wait 60-90 seconds → brief appears with interview_id
□ Click Schema tab → Document 4 schema shows with orange fields
□ Click Email tab → interviewee email shows, looks clean
□ Open new tab: [your-amplify-url]/i/[interview_id]
  → Info page loads, NO survey, NO toggles ✓
□ Back on brief: click Post-Interview tab
  → Fill in debrief fields → Save
  → "Debrief Complete" message appears ✓
□ Confirm DynamoDB: open axis-interviews table → item exists with debrief_completed: true
```

All 7 checked = you're ready to demo 🎉

---

## Common Workshop Account Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Not authorized to perform: iam:CreateRole" | Use the existing LabRole or WSParticipantRole — find it in IAM → Roles |
| Bedrock "Model access" not visible | Ask AWS engineer — some workshop configs pre-approve or restrict Bedrock differently |
| Lambda can't write to S3 | Check the IAM role has AmazonS3FullAccess — or add inline policy |
| API Gateway CORS error in browser | Re-run Enable CORS on each resource, redeploy to prod |
| Amplify shows old version | Hard refresh: Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac |
| Lambda execution role error | In Lambda → Configuration → Permissions → confirm role shows axis-lambda-role |
| DynamoDB "ResourceNotFoundException" | Lambda is pointing to wrong table name — verify exact spelling: axis-interviews |
| Workshop account session expires | Re-login via catalog.workshops.aws — your resources persist, just the session expires |

---

## If You Get Stuck

1. Check **CloudWatch Logs** for the failing Lambda:
   - Lambda → Functions → click function → Monitor tab → View CloudWatch logs
   - The error will be in the latest log stream

2. Most common errors and what they mean:
   ```
   "AccessDeniedException"  → IAM role missing a permission
   "ResourceNotFoundException" → Wrong table/bucket name (check spelling)
   "ModelNotReady" → Bedrock approval still pending (wait and retry)
   "Task timed out" → Increase Lambda timeout (pipeline needs 5 min)
   ```

3. Ask an AWS engineer — they're there to help and expect these questions
