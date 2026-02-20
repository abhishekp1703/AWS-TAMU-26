# AWS Setup Guide — Complete Step by Step
### Written for people who have never used AWS before

> NOTE: Do NOT run this file with python (e.g. `python3 < infrastructure/setup_guide.md`). It's documentation. If the guide includes runnable scripts, run those scripts directly.

---

## Quick changes / highlights in this revision
- Make region explicit and consistent (default: us-east-1). Add CLI commands to set region.
- Prefer using the provided deploy script (`deploy.sh`) to avoid manual errors and to keep the deployment repeatable.
- Align API Gateway endpoints with the repo's deploy script: `/scrape`, `/generate`, `/brief/{id}`, `/debrief/{id}` (the repo does not expose an `/interviewee/{id}` API).
- Align IAM policy recommendations with the deploy script (no AmazonSESFullAccess unless you actually need SES).
- Stronger guidance about S3 public access: leaving "Block all public access" enabled is safer; if the workshop requires public files, document the tradeoffs and exact steps.
- Add troubleshooting tips for expired credentials and `ResourceConflictException`.
- Add explicit commands to run the prompt-injection script (do not pipe the markdown into python).

---

## Prerequisites (add these before Step 1)
- AWS CLI v2 installed and configured, or AWS SSO configured
- python3, zip, jq (optional but useful)
- git
- Recommended: open an integrated terminal in VS Code

Set region for CLI (run once):
```bash
export AWS_REGION=us-east-1
aws configure set region us-east-1
```

Refresh credentials if using SSO or workshop temporary creds:
```bash
# SSO
aws sso login --profile <profile>
# or re-paste temporary credentials into ~/.aws/credentials for workshop accounts
```

---

## GOLDEN RULES (updated)
1. DEFAULT REGION: use us-east-1 for this workshop unless you intentionally deploy elsewhere. Always pass `--region` or set `AWS_REGION`.
2. Copy every ARN/URL into WAR_ROOM.md immediately.
3. Do services in this exact order for reproducibility — but use the provided automation where possible (`deploy.sh`).
4. If you receive `ExpiredToken` or `ResourceConflict`, follow the troubleshooting notes at the end.

---

## STEP 1: Access or configure the account
(unchanged text)...

---

## STEP 2: IAM Role (5 min) — (recommended follow the deploy script)
The deploy script attaches these policies:
- AmazonBedrockFullAccess
- AmazonS3FullAccess
- AmazonDynamoDBFullAccess
- AWSLambdaBasicExecutionRole

Do NOT add extraneous wide permissions (like SES) unless your workshop uses them. If you need SES, add it explicitly.

If you prefer Console steps, follow the original instructions but confirm the policy list above.

---

## STEP 3: S3 Bucket (5 min) — Security note
Bucket name must be globally unique.

Important security note:
- Prefer to KEEP "Block all public access" enabled and use signed URLs / presigned uploads if you need external access.
- If the workshop requires public access for demonstration, document that this weakens security and only enable it temporarily.

CORS configuration (safe):
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

---

## STEP 4: DynamoDB Tables (unchanged)
(unchanged instructions)...

---

## STEP 5: Enable Amazon Bedrock (keep in us-east-1)
(unchanged, but remind: region must be us-east-1)

---

## STEP 6: Lambda Functions — Use automation (recommended)
Instead of manually creating each Lambda in the console, run the repo's deploy script which creates roles, buckets, tables and deploys all Lambdas consistently.

From repo root:
```bash
cd ~/AWS-TAMU-26
# create the deploy script if missing (deploy.sh provided in repo or earlier)
chmod +x deploy.sh
# deploy to default region (us-east-1)
./deploy.sh 2>&1 | tee deploy.log
# or deploy to another region
./deploy.sh us-west-2 2>&1 | tee deploy.log
```

If you must use the console, follow the original steps — but be careful:
- Set axis-pipeline timeout to 5 min and memory to 512 MB.
- Change BUCKET_NAME placeholders to the actual bucket name.
- Make sure the handler is `lambda_function.lambda_handler`.

Troubleshooting during Lambda deploy:
- If you see ResourceConflictException: wait until `LastUpdateStatus` != `InProgress`, then retry.
- Use:
```bash
aws lambda get-function-configuration --function-name axis-pipeline --region us-east-1 --output json
```

---

## STEP 7: Inject prompts into pipeline (use the script, not `python3 < file.md`)
Do NOT pipe the markdown into python. The guide contains a small python snippet that extracts `prompts/all_prompts.py` and replaces placeholders in `backend/lambda_pipeline/lambda_function.py`. Run it like this from repo root:

```bash
# extract the inject block from the guide (if you don't have the script file)
awk '/^```python/{flag=1;next}/^```/{flag=0}flag' infrastructure/setup_guide.md > /tmp/inject_prompts.py
# review before running:
less /tmp/inject_prompts.py
python3 /tmp/inject_prompts.py
# then redeploy just pipeline (ensure correct region)
cd /tmp && rm -rf lpkg && mkdir lpkg
cp ~/AWS-TAMU-26/backend/lambda_pipeline/lambda_function.py lpkg/lambda_function.py
(cd lpkg && zip -q lambda.zip lambda_function.py)
aws lambda update-function-code --function-name axis-pipeline --zip-file fileb:///tmp/lpkg/lambda.zip --region us-east-1
```

The guide's inline heredoc also works (safe to paste into shell) — but do not run the .md file itself through python.

---

## STEP 8: API Gateway — (corrected mapping)
The repo's deploy script creates these endpoints and maps them to Lambdas. If you do it manually, use this mapping:

| Resource         | Method | Lambda           |
|------------------|--------|------------------|
| /scrape          | POST   | axis-scraper     |
| /generate        | POST   | axis-pipeline    |
| /brief/{id}      | GET    | axis-get-brief   |
| /debrief/{id}    | POST   | axis-get-brief   |

Note: the repo does not wire `/interviewee/{id}` in API Gateway by default. If you need that, add it and map to `axis-interviewee`.

Enable CORS for each resource and deploy to stage `prod`. Copy the invoke URL into WAR_ROOM.md.

---

##
