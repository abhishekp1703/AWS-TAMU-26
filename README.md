# AXIS — Adaptive Interview Intelligence

[![CI/CD](https://github.com/abhishekp1703/AWS-TAMU-26/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/abhishekp1703/AWS-TAMU-26/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> Transform cold business interviews into warm, insight-rich conversations powered by Amazon Bedrock AI.

AXIS is an intelligent interview preparation system that uses AI to generate comprehensive company briefs, structured interview questions, and strategic insights in under 90 seconds. Built for Texas A&M University's business intelligence program, AXIS helps interviewers conduct more informed, productive conversations with executives.

## Features

- **Fast Intelligence Generation**: Complete interview briefs in 90 seconds
- **AI-Powered Research**: 6-stage Bedrock pipeline synthesizes company data, Texas context, and institutional memory
- **Structured Interview Questions**: 10 coached questions with rationale and follow-up guidance
- **Knowledge Gap Analysis**: Identifies what AI likely got wrong—perfect conversation opener
- **Intelligence Schema**: Pre-filled Texas business intelligence schema for knowledge graph
- **Executive Email**: Professional, zero-effort email to send interviewees
- **Institutional Memory**: Post-interview debriefs feed future interviews in the same sector
- **Serverless Architecture**: Fully serverless on AWS with auto-scaling

## Architecture

```
┌─────────────────┐
│  React Frontend │
│  (Amplify/S3)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Gateway    │
└────────┬────────┘
         │
    ┌────┴────┬──────────────┬─────────────┐
    ▼         ▼              ▼             ▼
┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Scraper│ │ Pipeline │ │ Debrief  │ │Interviewee│
│ Lambda │ │  Lambda  │ │  Lambda  │ │  Lambda  │
└───┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
    │           │             │            │
    └───────────┴─────────────┴────────────┘
                │
    ┌───────────┴───────────┐
    ▼                       ▼
┌──────────┐          ┌──────────┐
│ DynamoDB │          │    S3    │
│  Tables  │          │  Storage  │
└──────────┘          └──────────┘
```

### The 6-Call Bedrock Pipeline

1. **Research Synthesis** → Structured company profile from scraped data
2. **Texas Context** → ERCOT, deregulation, sector trends, institutional memory
3. **Interview Questions** → 10 questions with coaching + 5 preview for email
4. **Knowledge Gap Analysis** → What AI likely got wrong (warm opener)
5. **Final Assembly** → Interviewer brief + interviewee info email
6. **Intelligence Schema** → Document 4 pre-fill for Texas knowledge graph

## Quick Start

### Prerequisites

- **AWS Account** with appropriate permissions
- **AWS CLI v2** installed and configured
- **Python 3.12+** installed
- **Node.js 18+** installed
- **Bedrock Model Access** (request in AWS Console)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/abhishekp1703/AWS-TAMU-26.git
   cd AWS-TAMU-26
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with your AWS configuration
   ```

3. **Request Bedrock model access**
   - Go to AWS Console → Amazon Bedrock → Model access
   - Request access for:
     - `anthropic.claude-3-5-sonnet-20241022-v2:0`
     - `anthropic.claude-3-sonnet-20240229-v1:0` (backup)

4. **Deploy infrastructure**
   ```bash
   ./scripts/deploy.sh production us-east-1
   ```

5. **Inject prompts into pipeline**
   ```bash
   python3 scripts/inject_prompts.py
   ```

6. **Deploy frontend**
   - **Option A: AWS Amplify** (Recommended)
     - Connect repository to Amplify
     - Set `REACT_APP_API_URL` environment variable
   
   - **Option B: S3 + CloudFront**
     ```bash
     cd frontend
     npm install
     npm run build
     aws s3 sync build/ s3://your-bucket-name --delete
     ```

### Verify Deployment

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
```

## Development

### Local Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend && npm install

# Run tests
pytest

# Start frontend dev server
cd frontend && npm start
```

### Project Structure

```
AWS-TAMU-26/
├── backend/
│   ├── config.py              # Configuration management
│   ├── utils/                 # Shared utilities
│   │   ├── logger.py         # Structured logging
│   │   ├── errors.py         # Error handling
│   │   └── bedrock_client.py # Bedrock wrapper
│   ├── lambda_scraper/        # Web scraping Lambda
│   ├── lambda_pipeline/       # 6-call Bedrock pipeline
│   ├── lambda_debrief/        # Post-interview processing
│   └── tests/                 # Test suite
├── frontend/                  # React application
├── infrastructure/
│   └── cloudformation/      # IaC templates
├── scripts/                   # Deployment scripts
└── prompts/                   # Bedrock prompts
```

### Code Quality

```bash
# Lint code
flake8 backend/

# Format code
black backend/

# Run pre-commit hooks
pre-commit run --all-files

# Run tests with coverage
pytest --cov=backend --cov-report=html
```

## Deployment

### Automated Deployment

The project includes a complete CI/CD pipeline via GitHub Actions that:
- Lints and tests code on every push
- Builds and packages Lambda functions
- Deploys to AWS on merge to main
- Runs integration tests

### Manual Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

**Quick deploy:**
```bash
./scripts/deploy.sh production us-east-1
```

## Monitoring & Observability

AXIS includes comprehensive monitoring:

- **CloudWatch Logs**: Structured JSON logs for all Lambda functions
- **CloudWatch Metrics**: Lambda, API Gateway, and Bedrock metrics
- **X-Ray Tracing**: Distributed tracing enabled for performance analysis
- **Custom Dashboards**: Business and technical metrics
- **Alarms**: Automated alerts for errors and performance issues

For complete monitoring setup, see [MONITORING.md](MONITORING.md).

### Example CloudWatch Logs Insights Query

```sql
-- Find all errors in the last hour
fields @timestamp, @message, interview_id, company_name
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
```

## Security

- **IAM Roles**: Least privilege principle with minimal required permissions
- **Encryption**: S3 and DynamoDB encryption at rest enabled
- **Input Validation**: All user inputs validated and sanitized
- **CORS**: Configured with specific allowed origins
- **Secrets Management**: Environment variables and AWS Secrets Manager
- **VPC Support**: Can be deployed in VPC for additional security

## Performance

- **Pipeline Duration**: < 90 seconds average
- **API Latency**: < 2 seconds (p95)
- **Bedrock Calls**: Optimized with retry logic and fallback models
- **Cold Starts**: Minimized with appropriate Lambda memory allocation

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=backend --cov-report=term-missing

# Run specific test file
pytest backend/tests/test_errors.py

# Run integration tests
pytest -m integration
```

## Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete production deployment guide
- **[MONITORING.md](MONITORING.md)** - Monitoring and observability setup
- **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** - Pre-deployment checklist
- **[PRODUCTION_SUMMARY.md](PRODUCTION_SUMMARY.md)** - Summary of production improvements
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes

## Use Cases

- **Business Intelligence**: Prepare for executive interviews with comprehensive company research
- **Academic Research**: Conduct structured interviews with AI-assisted question generation
- **Market Research**: Build institutional knowledge graphs from interview data
- **Student Projects**: Learn serverless architecture and AI integration

## Roadmap

- [ ] Multi-region deployment support
- [ ] Enhanced institutional memory with vector search
- [ ] Real-time interview co-pilot mode
- [ ] Integration with CRM systems
- [ ] Advanced analytics dashboard
- [ ] Mobile application

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`pytest && flake8 backend/`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow PEP 8 style guide
- Write tests for new features
- Update documentation as needed
- Use conventional commit messages

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **Texas A&M University** - For the opportunity to build this system
- **Amazon Bedrock** - For powerful AI capabilities
- **AWS Serverless** - For scalable infrastructure
- **Open Source Community** - For excellent tools and libraries

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing documentation
- Review CloudWatch Logs for debugging

## Tech Stack

- **Frontend**: React 18, React Router, Axios
- **Backend**: Python 3.12, AWS Lambda
- **AI**: Amazon Bedrock (Claude 3.5 Sonnet)
- **Infrastructure**: AWS (API Gateway, DynamoDB, S3, CloudWatch, X-Ray)
- **IaC**: CloudFormation
- **CI/CD**: GitHub Actions
- **Testing**: pytest, moto

---

**Built for Texas A&M University**

*Transform interviews. Build knowledge. Make connections.*
