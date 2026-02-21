# AXIS Production Deployment Guide

This guide covers deploying AXIS to a production environment on AWS.

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** v2 installed and configured
3. **Python 3.12** installed
4. **Node.js 18+** installed (for frontend)
5. **Git** installed

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/abhishekp1703/AWS-TAMU-26.git
cd AWS-TAMU-26
```

### 2. Configure Environment

Create environment-specific configuration files:

```bash
# Copy example environment file
cp .env.example .env.production

# Edit with your values
nano .env.production
```

Required variables:
- `S3_BUCKET_NAME`: Globally unique S3 bucket name
- `AWS_REGION`: AWS region (default: us-east-1)
- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated)

### 3. Request Bedrock Model Access

Before deploying, request access to Bedrock models:

1. Go to AWS Console → Amazon Bedrock
2. Navigate to "Model access"
3. Request access for:
   - `anthropic.claude-3-5-sonnet-20241022-v2:0`
   - `anthropic.claude-3-sonnet-20240229-v1:0` (backup)

This typically takes a few minutes to approve.

### 4. Deploy Infrastructure

Deploy the CloudFormation stack:

```bash
./scripts/deploy.sh production us-east-1
```

This will:
- Create S3 bucket for interview data
- Create DynamoDB tables
- Create IAM roles and policies
- Create API Gateway
- Create Lambda functions (with placeholder code)

### 5. Inject Prompts into Pipeline Lambda

The pipeline Lambda needs the actual prompts. Run:

```bash
python3 scripts/inject_prompts.py
```

This extracts prompts from `prompts/all_prompts.py` and injects them into `backend/lambda_pipeline/lambda_function.py`.

### 6. Deploy Lambda Functions

The deploy script packages and deploys all Lambda functions automatically. If you need to redeploy manually:

```bash
# Package a specific Lambda
cd backend/lambda_pipeline
zip -r ../../dist/lambda_pipeline.zip . -x "*.pyc" "__pycache__/*"

# Deploy
aws lambda update-function-code \
  --function-name axis-pipeline-production \
  --zip-file fileb://../../dist/lambda_pipeline.zip \
  --region us-east-1
```

### 7. Deploy Frontend

#### Option A: AWS Amplify (Recommended)

1. Connect your GitHub repository to AWS Amplify
2. Configure build settings:
   - Build command: `cd frontend && npm install && npm run build`
   - Output directory: `frontend/build`
3. Set environment variable: `REACT_APP_API_URL` = your API Gateway URL

#### Option B: S3 + CloudFront

```bash
# Build frontend
cd frontend
npm install
npm run build

# Upload to S3
aws s3 sync build/ s3://your-frontend-bucket --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

### 8. Update API Gateway CORS

Ensure CORS is configured for your frontend domain:

```bash
# Update via AWS Console or CLI
aws apigateway put-gateway-response \
  --rest-api-id YOUR_API_ID \
  --response-type DEFAULT_4XX \
  --response-parameters '{"gatewayresponse.header.Access-Control-Allow-Origin":"'"https://your-domain.com"'"}'
```

## Verification

### Test API Endpoints

```bash
# Get API Gateway URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name axis-production \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text)

# Test scrape endpoint
curl -X POST "${API_URL}/scrape" \
  -H "Content-Type: application/json" \
  -d '{"company_name": "Test Company", "company_url": "https://example.com"}'

# Test generate endpoint
curl -X POST "${API_URL}/generate" \
  -H "Content-Type: application/json" \
  -d '{"company_name": "Test Company", "scraped_content": "Test content"}'
```

### Check CloudWatch Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/axis-pipeline-production --follow

# View API Gateway logs
aws logs tail /aws/apigateway/axis-api-production --follow
```

## Monitoring

### CloudWatch Dashboards

Create a CloudWatch dashboard to monitor:
- Lambda invocation count and errors
- API Gateway request count and latency
- Bedrock API call success rate
- DynamoDB read/write capacity

### Alarms

Set up CloudWatch alarms for:
- Lambda error rate > 5%
- API Gateway 5xx errors
- Lambda duration approaching timeout
- Bedrock throttling errors

Example alarm:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name axis-lambda-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

## Security Best Practices

1. **S3 Bucket**: Keep "Block all public access" enabled
2. **IAM Roles**: Use least privilege principle
3. **API Gateway**: Consider adding API keys or Cognito authentication
4. **Secrets**: Use AWS Secrets Manager for sensitive data
5. **VPC**: Consider deploying Lambdas in VPC for additional security
6. **Encryption**: Enable encryption at rest for S3 and DynamoDB

## Troubleshooting

### Lambda Timeout

If pipeline Lambda times out:
- Increase timeout in CloudFormation template (max 900s)
- Increase memory allocation (more memory = more CPU)
- Check Bedrock model response times

### Bedrock Access Denied

Ensure:
- Bedrock model access is approved
- Lambda IAM role has `bedrock:InvokeModel` permission
- Region is correct (us-east-1 for Claude models)

### CORS Errors

Check:
- API Gateway CORS configuration
- Frontend API_URL matches API Gateway URL
- Allowed origins in CloudFormation parameters

### DynamoDB Errors

Verify:
- Table names match environment variables
- IAM role has DynamoDB permissions
- Region is consistent across services

## Rollback

To rollback to a previous version:

```bash
# Rollback Lambda function
aws lambda update-function-code \
  --function-name axis-pipeline-production \
  --zip-file fileb://previous-version.zip

# Rollback CloudFormation stack
aws cloudformation rollback-stack \
  --stack-name axis-production
```

## Cost Optimization

1. **DynamoDB**: Use on-demand billing for variable workloads
2. **Lambda**: Right-size memory allocation
3. **S3**: Enable lifecycle policies to delete old versions
4. **CloudWatch**: Set log retention periods
5. **API Gateway**: Use caching where possible

## Support

For issues or questions:
- Check CloudWatch Logs
- Review Lambda function errors
- Check API Gateway execution logs
- Review this documentation
