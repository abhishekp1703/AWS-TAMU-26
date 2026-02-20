# AXIS — AWS Workshop Studio Setup Guide
### Using the browser-based VSCode with SAM CLI pre-installed

> This guide uses the terminal inside your workshop VSCode — no AWS Console
> clicking required. Run the scripts and everything deploys automatically.
> Estimated time: 30 minutes total.

---

## STEP 0: Access the Workshop VSCode Environment

1. In AWS Console → search **CloudFormation**
2. Click the stack named **code-server-stack** → **Outputs** tab
3. Find two values:
   - `CodeServerCloudFrontDomainName` → your VSCode URL
   - `CodeServerPassWord` → your password (usually your AWS Account ID)
4. Open the CloudFront URL in a new browser tab
5. Enter the password → VSCode opens in your browser

---

## STEP 1: Open a Terminal in VSCode

- Click **Terminal** → **New Terminal**
- You have a full Linux terminal inside your browser

---

## STEP 2: Verify Pre-installed Tools

```bash
aws --version
sam --version
python3 --version
node --version
git --version
```

All should return version numbers. If anything is missing, ask an AWS engineer.

---

## STEP 3: Configure AWS Credentials

Get your credentials from the Workshop portal (catalog.workshops.aws)
Look for the "Get AWS CLI credentials" button and copy all three values.

```bash
nano ~/.aws/credentials
```

Paste (replace with your actual values):
```
[default]
aws_access_key_id = PASTE_YOUR_KEY
aws_secret_access_key = PASTE_YOUR_SECRET
aws_session_token = PASTE_YOUR_TOKEN
```

Save: Ctrl+O → Enter → Ctrl+X

```bash
nano ~/.aws/config
```

Paste:
```
[default]
region = us-east-1
output = json
```

Save: Ctrl+O → Enter → Ctrl+X

Verify it works:
```bash
aws sts get-caller-identity
```

You should see your Account ID and role name. If you do, credentials are working.

> Note: Workshop session tokens expire every few hours.
> If you get auth errors later, re-paste fresh credentials from the portal.

---

## STEP 4: Clone the AXIS Repo

```bash
cd ~
git clone https://github.com/abhishekp1703/AWS-TAMU-26.git
cd AWS-TAMU-26
ls
```

---

## STEP 5: Check What is Already Provisioned

```bash
# Check Bedrock Claude access
aws bedrock list-foundation-models --region us-east-1 \
  --query "modelSummaries[?contains(modelId,'claude-3-5')].[modelId]" \
  --output table

# Check existing IAM roles (look for LabRole or ParticipantRole)
aws iam list-roles \
  --query "Roles[?contains(RoleName,'Lab')||contains(RoleName,'Participant')].[RoleName]" \
  --output table

# Check existing S3 buckets
aws s3 ls

# Check existing DynamoDB tables
aws dynamodb list-tables --region us-east-1
```

Paste anything useful into WAR_ROOM.md. If Claude already shows up, Bedrock is pre-approved.

---

## STEP 6: Deploy All Infrastructure (One Script)

Create and run this script. It sets up everything automatically:
IAM role, S3, DynamoDB, Lambda functions, API Gateway.

```bash
cd ~/AWS-TAMU-26
nano deploy.sh
```

Paste the entire script below into the editor, then Ctrl+O → Enter → Ctrl+X:

---

### deploy.sh contents — paste this exactly:

```bash
#!/bin/bash
set -e

REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="axis-interviews-${ACCOUNT_ID}"

echo "=== AXIS Deployment Starting ==="
echo "Account: $ACCOUNT_ID | Bucket: $BUCKET_NAME"

# 1. IAM ROLE
echo "--- Creating IAM role..."
if aws iam get-role --role-name axis-lambda-role 2>/dev/null; then
    ROLE_ARN=$(aws iam get-role --role-name axis-lambda-role --query 'Role.Arn' --output text)
    echo "Role already exists: $ROLE_ARN"
else
    cat > /tmp/trust.json << 'TRUSTEOF'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}
TRUSTEOF
    ROLE_ARN=$(aws iam create-role --role-name axis-lambda-role \
        --assume-role-policy-document file:///tmp/trust.json \
        --query 'Role.Arn' --output text)
    for P in AmazonBedrockFullAccess AmazonS3FullAccess AmazonDynamoDBFullAccess AWSLambdaBasicExecutionRole; do
        aws iam attach-role-policy --role-name axis-lambda-role \
            --policy-arn "arn:aws:iam::aws:policy/$P"
        echo "Attached $P"
    done
    echo "Waiting 15s for role to propagate..."
    sleep 15
fi
echo "Role ARN: $ROLE_ARN"

# 2. S3 BUCKET
echo "--- Creating S3 bucket..."
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo "Bucket $BUCKET_NAME already exists"
else
    aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION"
    aws s3api put-public-access-block --bucket "$BUCKET_NAME" \
        --public-access-block-configuration \
        BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false
    cat > /tmp/cors.json << 'CORSEOF'
{"CORSRules":[{"AllowedHeaders":["*"],"AllowedMethods":["GET","PUT","POST","DELETE"],"AllowedOrigins":["*"],"ExposeHeaders":[]}]}
CORSEOF
    aws s3api put-bucket-cors --bucket "$BUCKET_NAME" --cors-configuration file:///tmp/cors.json
    echo "Created bucket: $BUCKET_NAME"
fi

# 3. DYNAMODB TABLES
echo "--- Creating DynamoDB tables..."
aws dynamodb describe-table --table-name axis-interviews --region "$REGION" 2>/dev/null || \
    aws dynamodb create-table \
        --table-name axis-interviews \
        --attribute-definitions AttributeName=interview_id,AttributeType=S \
        --key-schema AttributeName=interview_id,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST --region "$REGION" > /dev/null
echo "axis-interviews ready"

aws dynamodb describe-table --table-name axis-institutional-memory --region "$REGION" 2>/dev/null || \
    aws dynamodb create-table \
        --table-name axis-institutional-memory \
        --attribute-definitions \
            AttributeName=sector,AttributeType=S \
            AttributeName=interview_id,AttributeType=S \
        --key-schema \
            AttributeName=sector,KeyType=HASH \
            AttributeName=interview_id,KeyType=RANGE \
        --billing-mode PAY_PER_REQUEST --region "$REGION" > /dev/null
echo "axis-institutional-memory ready"

# 4. LAMBDA FUNCTIONS
echo "--- Deploying Lambda functions..."
deploy_lambda() {
    NAME=$1; SRCFILE=$2; TIMEOUT=$3; MEMORY=$4
    cd /tmp && rm -rf lpkg && mkdir lpkg
    cp ~/AWS-TAMU-26/$SRCFILE lpkg/lambda_function.py
    cd lpkg && zip -q lambda.zip lambda_function.py && cd ..
    if aws lambda get-function --function-name "$NAME" --region "$REGION" 2>/dev/null; then
        aws lambda update-function-code --function-name "$NAME" \
            --zip-file fileb:///tmp/lpkg/lambda.zip --region "$REGION" > /dev/null
    else
        aws lambda create-function \
            --function-name "$NAME" --runtime python3.12 \
            --role "$ROLE_ARN" \
            --handler lambda_function.lambda_handler \
            --zip-file fileb:///tmp/lpkg/lambda.zip \
            --timeout "$TIMEOUT" --memory-size "$MEMORY" \
            --region "$REGION" > /dev/null
    fi
    # Set bucket env var for pipeline and get-brief
    if [ "$NAME" = "axis-pipeline" ] || [ "$NAME" = "axis-get-brief" ]; then
        aws lambda update-function-configuration --function-name "$NAME" \
            --environment "Variables={BUCKET_NAME=$BUCKET_NAME}" \
            --region "$REGION" > /dev/null
    fi
    echo "Deployed $NAME"
    cd ~/AWS-TAMU-26
}

deploy_lambda "axis-scraper"     "backend/lambda_scraper/lambda_function.py"    30  128
deploy_lambda "axis-pipeline"    "backend/lambda_pipeline/lambda_function.py"   300 512
deploy_lambda "axis-interviewee" "backend/lambda_interviewee/lambda_function.py" 30 128
deploy_lambda "axis-get-brief"   "backend/lambda_debrief/lambda_function.py"    30  128

# 5. API GATEWAY
echo "--- Creating API Gateway..."
EXISTING=$(aws apigateway get-rest-apis --region "$REGION" \
    --query "items[?name=='axis-api'].id" --output text 2>/dev/null)
if [ -n "$EXISTING" ] && [ "$EXISTING" != "None" ]; then
    API_ID=$EXISTING
    echo "axis-api already exists: $API_ID"
else
    API_ID=$(aws apigateway create-rest-api --name axis-api \
        --endpoint-configuration types=REGIONAL \
        --region "$REGION" --query 'id' --output text)
    echo "Created API: $API_ID"
fi

ROOT_ID=$(aws apigateway get-resources --rest-api-id "$API_ID" \
    --region "$REGION" --query "items[?path=='/'].id" --output text)

mk_resource() {
    EXISTING=$(aws apigateway get-resources --rest-api-id "$1" --region "$REGION" \
        --query "items[?pathPart=='$3'&&parentId=='$2'].id" --output text 2>/dev/null)
    if [ -n "$EXISTING" ] && [ "$EXISTING" != "None" ]; then echo "$EXISTING"
    else aws apigateway create-resource --rest-api-id "$1" --parent-id "$2" \
        --path-part "$3" --region "$REGION" --query 'id' --output text; fi
}

mk_method() {
    API=$1; RES=$2; METHOD=$3; FUNC=$4
    URI="arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNC}/invocations"
    aws apigateway put-method --rest-api-id "$API" --resource-id "$RES" \
        --http-method "$METHOD" --authorization-type NONE \
        --region "$REGION" > /dev/null 2>&1 || true
    aws apigateway put-integration --rest-api-id "$API" --resource-id "$RES" \
        --http-method "$METHOD" --type AWS_PROXY \
        --integration-http-method POST --uri "$URI" \
        --region "$REGION" > /dev/null 2>&1 || true
    aws lambda add-permission --function-name "$FUNC" \
        --statement-id "apigw-${RES}-${METHOD}-$$" \
        --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API}/*/*" \
        --region "$REGION" > /dev/null 2>&1 || true
    # CORS OPTIONS
    aws apigateway put-method --rest-api-id "$API" --resource-id "$RES" \
        --http-method OPTIONS --authorization-type NONE \
        --region "$REGION" > /dev/null 2>&1 || true
    aws apigateway put-integration --rest-api-id "$API" --resource-id "$RES" \
        --http-method OPTIONS --type MOCK \
        --request-templates '{"application/json":"{\"statusCode\":200}"}' \
        --region "$REGION" > /dev/null 2>&1 || true
    aws apigateway put-method-response --rest-api-id "$API" --resource-id "$RES" \
        --http-method OPTIONS --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Headers":false,"method.response.header.Access-Control-Allow-Methods":false,"method.response.header.Access-Control-Allow-Origin":false}' \
        --region "$REGION" > /dev/null 2>&1 || true
    aws apigateway put-integration-response --rest-api-id "$API" --resource-id "$RES" \
        --http-method OPTIONS --status-code 200 \
        --response-parameters "{\"method.response.header.Access-Control-Allow-Headers\":\"'Content-Type'\",\"method.response.header.Access-Control-Allow-Methods\":\"'GET,POST,OPTIONS'\",\"method.response.header.Access-Control-Allow-Origin\":\"'*'\"}" \
        --region "$REGION" > /dev/null 2>&1 || true
}

SCRAPE_ID=$(mk_resource "$API_ID" "$ROOT_ID" "scrape")
mk_method "$API_ID" "$SCRAPE_ID" "POST" "axis-scraper"

GEN_ID=$(mk_resource "$API_ID" "$ROOT_ID" "generate")
mk_method "$API_ID" "$GEN_ID" "POST" "axis-pipeline"

BRIEF_ID=$(mk_resource "$API_ID" "$ROOT_ID" "brief")
BRIEF_P=$(mk_resource "$API_ID" "$BRIEF_ID" "{id}")
mk_method "$API_ID" "$BRIEF_P" "GET" "axis-get-brief"

DEB_ID=$(mk_resource "$API_ID" "$ROOT_ID" "debrief")
DEB_P=$(mk_resource "$API_ID" "$DEB_ID" "{id}")
mk_method "$API_ID" "$DEB_P" "POST" "axis-get-brief"

aws apigateway create-deployment --rest-api-id "$API_ID" \
    --stage-name prod --region "$REGION" > /dev/null

API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod"

echo ""
echo "==================================================="
echo "  DEPLOYMENT COMPLETE"
echo "==================================================="
echo "  Bucket:   $BUCKET_NAME"
echo "  API URL:  $API_URL"
echo ""
echo "  COPY THIS INTO App.js line 4:"
echo "  const API_URL = '$API_URL';"
echo "==================================================="
```

---

After pasting, make it executable and run it:

```bash
chmod +x deploy.sh
./deploy.sh 2>&1 | tee deploy.log
```

**This takes about 5-8 minutes.** Watch for any errors.
When you see "DEPLOYMENT COMPLETE" — copy the API URL into WAR_ROOM.md immediately.

---

## STEP 7: Paste Prompts Into the Pipeline Lambda

The pipeline Lambda has placeholder text for all 6 prompts.
You need to replace `[PASTE X HERE]` with actual prompt content.

**Fastest way — use this script:**

```bash
cd ~/AWS-TAMU-26
python3 << 'PYEOF'
import re

# Read both files
with open('prompts/all_prompts.py', 'r') as f:
    prompts_code = f.read()

with open('backend/lambda_pipeline/lambda_function.py', 'r') as f:
    pipeline = f.read()

# Extract each prompt variable by executing the prompts file
namespace = {}
exec(prompts_code, namespace)

# Replace placeholders
replacements = {
    'SYNTHESIS_PROMPT': 'SYNTHESIS_PROMPT',
    'TEXAS_PROMPT': 'TEXAS_PROMPT',
    'QUESTIONS_PROMPT': 'QUESTIONS_PROMPT',
    'GAPS_PROMPT': 'GAPS_PROMPT',
    'ASSEMBLY_PROMPT': 'ASSEMBLY_PROMPT',
    'SCHEMA_PROMPT': 'SCHEMA_PROMPT',
}

for var_name in replacements:
    if var_name in namespace:
        placeholder = f'{var_name} = """[PASTE {var_name} HERE]"""'
        actual_value = namespace[var_name].replace('"""', '\\"\\"\\"')
        replacement = f'{var_name} = """{namespace[var_name]}"""'
        if placeholder in pipeline:
            pipeline = pipeline.replace(placeholder, replacement)
            print(f"Replaced {var_name}")
        else:
            print(f"WARNING: placeholder not found for {var_name}")

with open('backend/lambda_pipeline/lambda_function.py', 'w') as f:
    f.write(pipeline)

print("Done - pipeline Lambda now has all prompts embedded")
PYEOF
```

**Then redeploy just the pipeline Lambda:**

```bash
cd /tmp && rm -rf lpkg && mkdir lpkg
cp ~/AWS-TAMU-26/backend/lambda_pipeline/lambda_function.py lpkg/lambda_function.py
cd lpkg && zip -q lambda.zip lambda_function.py
aws lambda update-function-code \
    --function-name axis-pipeline \
    --zip-file fileb:///tmp/lpkg/lambda.zip \
    --region us-east-1
echo "Pipeline Lambda updated with prompts"
```

---

## STEP 8: Request Bedrock Access (if not already granted)

```bash
# Check status
aws bedrock list-foundation-models --region us-east-1 \
  --query "modelSummaries[?contains(modelId,'claude-3-5-sonnet')].[modelId,modelLifecycle.status]" \
  --output table
```

If status is not ACTIVE:
1. Go to AWS Console → search **Bedrock**
2. Left sidebar → **Model access**
3. Click **Modify model access**
4. Check **Claude 3.5 Sonnet** and **Claude 3 Sonnet** (backup)
5. Submit → wait 2-5 minutes → refresh until "Access granted"

---

## STEP 9: Deploy the Frontend

```bash
cd ~/AWS-TAMU-26

# Update the API URL in App.js (replace with your actual URL from deploy.sh output)
API_URL="https://REPLACE_WITH_YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod"
sed -i "s|YOUR_API_GATEWAY_URL_HERE|$API_URL|g" frontend/src/App.js

# Verify it was replaced
grep "API_URL" frontend/src/App.js | head -1
```

**Build and deploy to Amplify:**

```bash
# Check if npm is available
npm --version || (curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs)

# Create React app
cd ~
npx create-react-app axis-app --template minimal 2>/dev/null || npx create-react-app axis-app
cd axis-app
npm install axios react-router-dom

# Copy App.js
cp ~/AWS-TAMU-26/frontend/src/App.js src/App.js

# Build
npm run build
echo "Build complete"
```

**Deploy to Amplify via CLI:**

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"

# Create Amplify app
APP_ID=$(aws amplify create-app \
    --name axis-frontend \
    --region "$REGION" \
    --query 'app.appId' --output text)

echo "Amplify App ID: $APP_ID"

# Create branch
aws amplify create-branch \
    --app-id "$APP_ID" \
    --branch-name main \
    --region "$REGION" > /dev/null

# Zip the build folder and deploy
cd ~/axis-app
zip -r /tmp/build.zip build/

aws amplify start-deployment \
    --app-id "$APP_ID" \
    --branch-name main \
    --source-url "s3://" \
    --region "$REGION" > /dev/null || echo "Use manual deploy below"

echo ""
echo "If Amplify CLI deploy failed, use manual method:"
echo "1. Open AWS Console → Amplify"
echo "2. Click your app → Hosting → Deploy without Git"
echo "3. Drag the ~/axis-app/build folder"
```

**OR the manual fallback (always works):**

1. Open AWS Console → search **Amplify**
2. Your app should already be there — click it
3. If not: New app → Host web app → Deploy without Git
4. Drag the `~/axis-app/build` folder into the upload box
5. Save and deploy → wait 2 minutes → copy URL

---

## STEP 10: Test the Full Flow

```bash
# Quick API test
API_URL=$(grep "API_URL" ~/AWS-TAMU-26/frontend/src/App.js | grep -o "https://[^'\"]*")
echo "Testing: $API_URL"

curl -s -X POST "$API_URL/scrape" \
  -H "Content-Type: application/json" \
  -d '{"company_name":"GridFlex Energy","company_url":"https://example.com"}' | python3 -m json.tool | head -20
```

If you get JSON back with `scraped_content` — the backend is working.

Then open your Amplify URL in a browser and run the full flow:
1. Type GridFlex Energy → Generate
2. Wait 90 seconds → brief appears
3. Click Schema tab → Document 4 shows
4. Click Email tab → info email shows
5. Open /i/{interview_id} → info page, no survey
6. Post-Interview tab → fill debrief → save → Complete

---

## Common Issues in Workshop Accounts

| Error | Cause | Fix |
|-------|-------|-----|
| `not authorized: iam:CreateRole` | Role permissions restricted | Find LabRole/ParticipantRole in IAM, use that ARN instead |
| `ModelNotReady` in Lambda logs | Bedrock not approved yet | Approve in Console → wait 5 min |
| `NoSuchBucket` | Bucket name mismatch | Check BUCKET_NAME env var on Lambda matches actual bucket |
| `AccessDenied` on S3 | IAM role missing S3 policy | Re-attach AmazonS3FullAccess to role |
| Credentials expired | Workshop tokens expire | Re-paste fresh creds from portal into ~/.aws/credentials |
| Lambda timeout | Pipeline needs 5 min | aws lambda update-function-configuration --timeout 300 |
