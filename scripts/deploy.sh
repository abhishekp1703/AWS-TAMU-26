#!/bin/bash
# Production deployment script for AXIS
# Usage: ./scripts/deploy.sh [environment] [region]

set -e  # Exit on error

ENVIRONMENT=${1:-production}
REGION=${2:-us-east-1}
STACK_NAME="axis-${ENVIRONMENT}"

echo "🚀 Deploying AXIS to ${ENVIRONMENT} in ${REGION}..."

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo "❌ Invalid environment: $ENVIRONMENT. Must be development, staging, or production."
    exit 1
fi

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
    echo "📝 Loading environment variables from .env.${ENVIRONMENT}..."
    export $(cat .env.${ENVIRONMENT} | grep -v '^#' | xargs)
fi

# Package Lambda functions
echo "📦 Packaging Lambda functions..."
mkdir -p dist
for lambda_dir in backend/lambda_*; do
    if [ -d "$lambda_dir" ]; then
        lambda_name=$(basename $lambda_dir)
        echo "  Packaging $lambda_name..."
        
        # Create temporary directory
        temp_dir=$(mktemp -d)
        cp -r "$lambda_dir"/* "$temp_dir/"
        
        # Copy shared utilities
        if [ -d "backend/utils" ]; then
            mkdir -p "$temp_dir/utils"
            cp -r backend/utils/* "$temp_dir/utils/"
        fi
        
        if [ -f "backend/config.py" ]; then
            cp backend/config.py "$temp_dir/"
        fi
        
        # Install dependencies if requirements.txt exists
        if [ -f "requirements.txt" ]; then
            pip install -r requirements.txt -t "$temp_dir" --quiet
        fi
        
        # Create zip file
        cd "$temp_dir"
        zip -r "../../dist/${lambda_name}.zip" . -q
        cd - > /dev/null
        
        # Cleanup
        rm -rf "$temp_dir"
    fi
done

# Deploy CloudFormation stack
echo "☁️  Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file infrastructure/cloudformation/template.yaml \
    --stack-name "$STACK_NAME" \
    --parameter-overrides \
        Environment="$ENVIRONMENT" \
        BucketName="${S3_BUCKET_NAME:-axis-interviews-${ENVIRONMENT}}" \
        AllowedOrigins="${ALLOWED_ORIGINS:-*}" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "$REGION" \
    --no-fail-on-empty-changeset

# Deploy Lambda functions
echo "⚡ Deploying Lambda functions..."
for zip_file in dist/*.zip; do
    if [ -f "$zip_file" ]; then
        lambda_name=$(basename "$zip_file" .zip)
        function_name="axis-${lambda_name#lambda_}-${ENVIRONMENT}"
        
        echo "  Deploying $function_name..."
        
        # Check if function exists
        if aws lambda get-function --function-name "$function_name" --region "$REGION" &> /dev/null; then
            # Update existing function
            aws lambda update-function-code \
                --function-name "$function_name" \
                --zip-file "fileb://$zip_file" \
                --region "$REGION" \
                --no-cli-pager > /dev/null
        else
            echo "  ⚠️  Function $function_name does not exist. Create it via CloudFormation first."
        fi
    fi
done

# Get stack outputs
echo "📊 Stack outputs:"
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs' \
    --region "$REGION" \
    --output table

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Update frontend API_URL with the API Gateway URL above"
echo "2. Deploy frontend to S3/CloudFront or Amplify"
echo "3. Test the API endpoints"
