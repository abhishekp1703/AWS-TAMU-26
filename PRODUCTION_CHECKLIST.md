# Production Readiness Checklist

Use this checklist to ensure your AXIS deployment is production-ready.

## Pre-Deployment

- [ ] AWS account configured with appropriate permissions
- [ ] Bedrock model access requested and approved
- [ ] Environment variables configured (`.env.production`)
- [ ] S3 bucket name is globally unique
- [ ] Domain name configured (if using custom domain)
- [ ] SSL certificate obtained (if using custom domain)

## Infrastructure

- [ ] CloudFormation stack deployed successfully
- [ ] S3 bucket created with encryption enabled
- [ ] DynamoDB tables created with point-in-time recovery
- [ ] IAM roles created with least privilege
- [ ] API Gateway created and configured
- [ ] Lambda functions deployed with correct environment variables
- [ ] Prompts injected into pipeline Lambda

## Security

- [ ] S3 bucket public access blocked
- [ ] IAM roles follow least privilege principle
- [ ] CORS configured with specific origins (not `*` in production)
- [ ] Environment variables don't contain secrets
- [ ] Secrets stored in AWS Secrets Manager (if applicable)
- [ ] API Gateway authentication configured (if needed)
- [ ] CloudWatch logs retention set appropriately

## Application

- [ ] All Lambda functions tested locally
- [ ] Frontend builds successfully
- [ ] API endpoints tested
- [ ] Error handling verified
- [ ] Logging configured and working
- [ ] X-Ray tracing enabled

## Monitoring

- [ ] CloudWatch dashboards created
- [ ] CloudWatch alarms configured
- [ ] SNS topics created for alerts
- [ ] Email/Slack notifications configured
- [ ] Log retention policies set
- [ ] Custom metrics defined (if needed)

## Testing

- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] End-to-end test completed
- [ ] Load testing performed (if applicable)
- [ ] Error scenarios tested

## Documentation

- [ ] README updated
- [ ] DEPLOYMENT.md reviewed
- [ ] MONITORING.md reviewed
- [ ] API documentation updated
- [ ] Runbooks created for common issues

## Post-Deployment

- [ ] API Gateway URL verified
- [ ] Frontend deployed and accessible
- [ ] CORS working correctly
- [ ] Test interview created successfully
- [ ] CloudWatch logs showing expected output
- [ ] No errors in CloudWatch metrics
- [ ] Alarms tested (trigger and resolve)

## Performance

- [ ] Pipeline completes in < 90 seconds
- [ ] API Gateway latency < 2 seconds (p95)
- [ ] Lambda cold start acceptable
- [ ] DynamoDB read/write capacity appropriate
- [ ] S3 access patterns optimized

## Cost Optimization

- [ ] DynamoDB billing mode appropriate (on-demand vs provisioned)
- [ ] CloudWatch log retention set (7-30 days)
- [ ] S3 lifecycle policies configured
- [ ] Unused resources removed
- [ ] Cost alerts configured

## Backup & Recovery

- [ ] DynamoDB point-in-time recovery enabled
- [ ] S3 versioning enabled
- [ ] Backup strategy documented
- [ ] Recovery procedure tested
- [ ] Disaster recovery plan documented

## Compliance

- [ ] Data retention policies defined
- [ ] Privacy policy updated (if applicable)
- [ ] Terms of service updated (if applicable)
- [ ] GDPR compliance (if applicable)
- [ ] HIPAA compliance (if applicable)

## Final Steps

- [ ] Production URL documented
- [ ] Team access configured
- [ ] Monitoring dashboards shared
- [ ] On-call rotation configured
- [ ] Post-deployment review scheduled

---

## Quick Health Check

Run these commands to verify deployment:

```bash
# Check stack status
aws cloudformation describe-stacks --stack-name axis-production

# Check Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `axis`)].FunctionName'

# Test API endpoint
curl -X POST "${API_URL}/scrape" \
  -H "Content-Type: application/json" \
  -d '{"company_name": "Test", "company_url": "https://example.com"}'

# Check recent logs
aws logs tail /aws/lambda/axis-pipeline-production --since 1h
```

---

**Last Updated**: 2026-02-20
