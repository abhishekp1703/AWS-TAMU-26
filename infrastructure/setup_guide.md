#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./deploy.sh                -> deploys to default region (us-east-1)
#   ./deploy.sh us-west-2     -> deploys to provided region
# Override repo root with REPO_ROOT env if needed

REPO_ROOT="${REPO_ROOT:-$HOME/AWS-TAMU-26}"
REGION="${1:-${AWS_REGION:-us-east-1}}"

echo "Repo root: $REPO_ROOT"
echo "Region: $REGION"

# Ensure AWS CLI works
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="axis-interviews-${ACCOUNT_ID}"

echo "=== AXIS Deployment Starting ==="
echo "Account: $ACCOUNT_ID | Bucket: $BUCKET_NAME | Region: $REGION"

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
    if [ "$REGION" = "us-east-1" ]; then
        aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION"
    else
        aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION" \
            --create-bucket-configuration LocationConstraint="$REGION"
    fi
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

# Helpers for Lambda deploy
wait_for_lambda_ready() {
    NAME=$1
    # wait up to 5 minutes for LastUpdateStatus != InProgress
    end=$((SECONDS+300))
    while [ $SECONDS -lt $end ]; do
        status=$(aws lambda get-function-configuration --function-name "$NAME" --region "$REGION" --query 'LastUpdateStatus' --output text 2>/dev/null || echo "None")
        if [ "$status" != "InProgress" ]; then
            break
        fi
        echo "Waiting for $NAME LastUpdateStatus -> $status"
        sleep 2
    done
}

safe_update_configuration() {
    NAME=$1
    shift
    # try once, on ResourceConflict wait and retry once
    if ! aws lambda update-function-configuration --function-name "$NAME" "$@" --region "$REGION" 2>/tmp/lcfg.err; then
        echo "First update-config failed, retrying once..."
        sleep 3
        aws lambda update-function-configuration --function-name "$NAME" "$@" --region "$REGION"
    fi
}

# 4. LAMBDA FUNCTIONS
echo "--- Deploying Lambda functions..."
deploy_lambda() {
    NAME=$1; SRCFILE=$2; TIMEOUT=$3; MEMORY=$4
    mkdir -p /tmp/lpkg
    rm -rf /tmp/lpkg/*
    cp "$REPO_ROOT/$SRCFILE" /tmp/lpkg/lambda_function.py
    (cd /tmp/lpkg && zip -q lambda.zip lambda_function.py)
    if aws lambda get-function --function-name "$NAME" --region "$REGION" 2>/dev/null; then
        aws lambda update-function-code --function-name "$NAME" \
            --zip-file fileb:///tmp/lpkg/lambda.zip --region "$REGION"
        wait_for_lambda_ready "$NAME"
    else
        aws lambda create-function \
            --function-name "$NAME" --runtime python3.12 \
            --role "$ROLE_ARN" \
            --handler lambda_function.lambda_handler \
            --zip-file fileb:///tmp/lpkg/lambda.zip \
            --timeout "$TIMEOUT" --memory-size "$MEMORY" \
            --region "$REGION"
        wait_for_lambda_ready "$NAME"
    fi

    # Set bucket env var for pipeline and get-brief
    if [ "$NAME" = "axis-pipeline" ] || [ "$NAME" = "axis-get-brief" ]; then
        safe_update_configuration "$NAME" --environment "Variables={BUCKET_NAME=$BUCKET_NAME}"
    fi

    echo "Deployed $NAME"
    cd "$REPO_ROOT"
}

deploy_lambda "axis-scraper"     "backend/lambda_scraper/lambda_function.py"    30  128
deploy_lambda "axis-pipeline"    "backend/lambda_pipeline/lambda_function.py"   300 512
deploy_lambda "axis-interviewee" "backend/lambda_interviewee/lambda_function.py" 30 128
deploy_lambda "axis-get-brief"   "backend/lambda_debrief/lambda_function.py"    30  128

# 5. API GATEWAY
echo "--- Creating API Gateway..."
EXISTING=$(aws apigateway get-rest-apis --region "$REGION" \
    --query "items[?name=='axis-api'].id" --output text 2>/dev/null || echo "")
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
        --query "items[?pathPart=='$3'&&parentId=='$2'].id" --output text 2>/dev/null || echo "")
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
```// filepath: ~/AWS-TAMU-26/deploy.sh
#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./deploy.sh                -> deploys to default region (us-east-1)
#   ./deploy.sh us-west-2     -> deploys to provided region
# Override repo root with REPO_ROOT env if needed

REPO_ROOT="${REPO_ROOT:-$HOME/AWS-TAMU-26}"
REGION="${1:-${AWS_REGION:-us-east-1}}"

echo "Repo root: $REPO_ROOT"
echo "Region: $REGION"

# Ensure AWS CLI works
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="axis-interviews-${ACCOUNT_ID}"

echo "=== AXIS Deployment Starting ==="
echo "Account: $ACCOUNT_ID | Bucket: $BUCKET_NAME | Region: $REGION"

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
    if [ "$REGION" = "us-east-1" ]; then
        aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION"
    else
        aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION" \
            --create-bucket-configuration LocationConstraint="$REGION"
    fi
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

# Helpers for Lambda deploy
wait_for_lambda_ready() {
    NAME=$1
    # wait up to 5 minutes for LastUpdateStatus != InProgress
    end=$((SECONDS+300))
    while [ $SECONDS -lt $end ]; do
        status=$(aws lambda get-function-configuration --function-name "$NAME" --region "$REGION" --query 'LastUpdateStatus' --output text 2>/dev/null || echo "None")
        if [ "$status" != "InProgress" ]; then
            break
        fi
        echo "Waiting for $NAME LastUpdateStatus -> $status"
        sleep 2
    done
}

safe_update_configuration() {
    NAME=$1
    shift
    # try once, on ResourceConflict wait and retry once
    if ! aws lambda update-function-configuration --function-name "$NAME" "$@" --region "$REGION" 2>/tmp/lcfg.err; then
        echo "First update-config failed, retrying once..."
        sleep 3
        aws lambda update-function-configuration --function-name "$NAME" "$@" --region "$REGION"
    fi
}

# 4. LAMBDA FUNCTIONS
echo "--- Deploying Lambda functions..."
deploy_lambda() {
    NAME=$1; SRCFILE=$2; TIMEOUT=$3; MEMORY=$4
    mkdir -p /tmp/lpkg
    rm -rf /tmp/lpkg/*
    cp "$REPO_ROOT/$SRCFILE" /tmp/lpkg/lambda_function.py
    (cd /tmp/lpkg && zip -q lambda.zip lambda_function.py)
    if aws lambda get-function --function-name "$NAME" --region "$REGION" 2>/dev/null; then
        aws lambda update-function-code --function-name "$NAME" \
            --zip-file fileb:///tmp/lpkg/lambda.zip --region "$REGION"
        wait_for_lambda_ready "$NAME"
    else
        aws lambda create-function \
            --function-name "$NAME" --runtime python3.12 \
            --role "$ROLE_ARN" \
            --handler lambda_function.lambda_handler \
            --zip-file fileb:///tmp/lpkg/lambda.zip \
            --timeout "$TIMEOUT" --memory-size "$MEMORY" \
            --region "$REGION"
        wait_for_lambda_ready "$NAME"
    fi

    # Set bucket env var for pipeline and get-brief
    if [ "$NAME" = "axis-pipeline" ] || [ "$NAME" = "axis-get-brief" ]; then
        safe_update_configuration "$NAME" --environment "Variables={BUCKET_NAME=$BUCKET_NAME}"
    fi

    echo "Deployed $NAME"
    cd "$REPO_ROOT"
}

deploy_lambda "axis-scraper"     "backend/lambda_scraper/lambda_function.py"    30  128
deploy_lambda "axis-pipeline"    "backend/lambda_pipeline/lambda_function.py"   300 512
deploy_lambda "axis-interviewee" "backend/lambda_interviewee/lambda_function.py" 30 128
deploy_lambda "axis-get-brief"   "backend/lambda_debrief/lambda_function.py"    30  128

# 5. API GATEWAY
echo "--- Creating API Gateway..."
EXISTING=$(aws apigateway get-rest-apis --region "$REGION" \
    --query "items[?name=='axis-api'].id" --output text 2>/dev/null || echo "")
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
        --query "items[?pathPart=='$3'&&parentId=='$2'].id" --output text 2>/dev/null || echo "")
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
