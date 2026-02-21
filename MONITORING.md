# AXIS Monitoring and Observability Guide

## CloudWatch Logs

All Lambda functions log to CloudWatch with structured JSON logs for easy querying.

### Log Groups

- `/aws/lambda/axis-scraper-production`
- `/aws/lambda/axis-pipeline-production`
- `/aws/lambda/axis-debrief-production`
- `/aws/apigateway/axis-api-production`

### Querying Logs

Example CloudWatch Logs Insights queries:

```sql
-- Find all errors in the last hour
fields @timestamp, @message, interview_id, company_name
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100

-- Pipeline execution times
fields @timestamp, interview_id, elapsed_seconds
| filter function_name = "axis-pipeline-production"
| stats avg(elapsed_seconds), max(elapsed_seconds), min(elapsed_seconds) by bin(5m)

-- Bedrock API call failures
fields @timestamp, interview_id, call_name, error_code
| filter error_code != ""
| stats count() by error_code

-- Most common errors
fields @message
| filter level = "ERROR"
| stats count() by @message
| sort count desc
```

## CloudWatch Metrics

### Lambda Metrics

Monitor these Lambda metrics:
- `Invocations`: Total number of invocations
- `Errors`: Number of errors
- `Duration`: Execution time
- `Throttles`: Number of throttled invocations
- `ConcurrentExecutions`: Number of concurrent executions

### API Gateway Metrics

- `Count`: Total number of requests
- `4XXError`: Client errors
- `5XXError`: Server errors
- `Latency`: Response latency
- `IntegrationLatency`: Backend latency

### Bedrock Metrics

- `ModelInvocationCount`: Number of model invocations
- `ModelInvocationLatency`: Model response time
- `ModelInvocationErrors`: Failed invocations

## CloudWatch Dashboards

Create a dashboard with these widgets:

1. **Lambda Health**
   - Invocation count (line chart)
   - Error rate (line chart)
   - Duration (line chart)
   - Throttles (line chart)

2. **API Gateway Health**
   - Request count (line chart)
   - Error rate (4xx + 5xx) (line chart)
   - Latency (line chart)

3. **Bedrock Usage**
   - Model invocations (line chart)
   - Model latency (line chart)
   - Model errors (line chart)

4. **Business Metrics**
   - Interviews created (count)
   - Average pipeline duration (gauge)
   - Debrief completion rate (gauge)

## Alarms

### Critical Alarms

```bash
# Lambda error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name axis-lambda-high-error-rate \
  --alarm-description "Alert when Lambda error rate exceeds 5%" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=FunctionName,Value=axis-pipeline-production

# API Gateway 5xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name axis-api-5xx-errors \
  --alarm-description "Alert on API Gateway 5xx errors" \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 60 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

### Warning Alarms

- Lambda duration > 80% of timeout
- API Gateway latency > 5 seconds
- Bedrock throttling detected
- DynamoDB throttling detected

## X-Ray Tracing

X-Ray is enabled for all Lambda functions. View traces in the AWS Console:

1. Go to AWS X-Ray service
2. Select "Traces" or "Service map"
3. Filter by service name or time range

### Adding Custom Annotations

```python
from aws_xray_sdk.core import xray_recorder

@xray_recorder.capture('bedrock_call')
def call_bedrock(prompt):
    xray_recorder.put_annotation('call_name', 'synthesis')
    xray_recorder.put_metadata('prompt_length', len(prompt))
    # ... rest of function
```

## Log Aggregation

For production, consider:
- **CloudWatch Logs Insights** for ad-hoc queries
- **CloudWatch Logs Subscription** to stream to:
  - Elasticsearch/OpenSearch
  - Kinesis Data Firehose
  - S3 for long-term storage

## Performance Monitoring

### Key Metrics to Track

1. **Pipeline Duration**
   - Target: < 90 seconds
   - Alert if: > 120 seconds

2. **Bedrock Latency**
   - Target: < 5 seconds per call
   - Alert if: > 10 seconds

3. **API Gateway Latency**
   - Target: < 2 seconds (p95)
   - Alert if: > 5 seconds

4. **Error Rate**
   - Target: < 1%
   - Alert if: > 5%

## Custom Metrics

Publish custom metrics for business KPIs:

```python
import boto3
cloudwatch = boto3.client('cloudwatch')

# Publish custom metric
cloudwatch.put_metric_data(
    Namespace='AXIS/Business',
    MetricData=[
        {
            'MetricName': 'InterviewsCreated',
            'Value': 1,
            'Unit': 'Count',
            'Dimensions': [
                {'Name': 'Sector', 'Value': 'energy'},
                {'Name': 'Environment', 'Value': 'production'}
            ]
        }
    ]
)
```

## Alerting

Configure SNS topics for alarms:

```bash
# Create SNS topic
aws sns create-topic --name axis-alerts

# Subscribe email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:axis-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com

# Update alarm to send to SNS
aws cloudwatch put-metric-alarm \
  --alarm-name axis-lambda-high-error-rate \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:axis-alerts \
  ...
```

## Best Practices

1. **Log Levels**: Use appropriate log levels (DEBUG, INFO, WARNING, ERROR)
2. **Structured Logging**: Always use structured JSON logs
3. **Correlation IDs**: Include interview_id in all logs for tracing
4. **Sampling**: Consider sampling for high-volume DEBUG logs
5. **Retention**: Set appropriate log retention (7-30 days for production)
6. **Cost**: Monitor CloudWatch costs and set budgets
