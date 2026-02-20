# AXIS — API Routes

Base URL: [paste from WAR_ROOM.md after deploying]

---

## POST /scrape
Scrapes public data about a company.

**Request:**
```json
{
  "company_name": "H-E-B",
  "company_url": "https://www.heb.com"
}
```

**Response:**
```json
{
  "scraped_content": "...",
  "company_name": "H-E-B",
  "logo_url": "https://logo.clearbit.com/heb.com",
  "sources_scraped": ["website", "about", "news", "wikipedia"]
}
```

---

## POST /generate
Runs the full AXIS pipeline (all 5 Bedrock calls).

**Request:**
```json
{
  "company_name": "H-E-B",
  "scraped_content": "...",
  "tamu_notes": "Optional internal context"
}
```

**Response:**
```json
{
  "interview_id": "A1B2C3D4",
  "company_name": "H-E-B",
  "brief": "Full interviewer brief text...",
  "interviewee_packet": "Interviewee packet text...",
  "facts": ["Fact 1", "Fact 2", "Fact 3", "Fact 4", "Fact 5"],
  "interviewee_questions": ["Q1", "Q2", "Q3", "Q4", "Q5"],
  "elapsed_seconds": 87.3
}
```

---

## GET /brief/{id}
Returns full interview data including interviewee response status.

**Response:**
```json
{
  "interview_id": "A1B2C3D4",
  "company_name": "H-E-B",
  "status": "pending_interviewee_response | interviewee_responded",
  "brief": "Full brief text...",
  "facts": ["..."],
  "interviewee_questions": ["..."],
  "interviewee_corrections": [],
  "interviewee_selected_questions": [],
  "interviewee_wildcard": "",
  "responded_at": "1234567890"
}
```

---

## POST /interviewee/{id}
Saves interviewee responses from the microsite.

**Request:**
```json
{
  "corrections": [
    { "original": "Fact text", "correction": "What's actually true" }
  ],
  "selected_questions": ["Question text they selected"],
  "wildcard": "What they wish interviewers asked"
}
```

**Response:**
```json
{
  "success": true,
  "interview_id": "A1B2C3D4",
  "message": "Response saved. The interviewer has been notified."
}
```

---

## CORS
All endpoints return:
```
Access-Control-Allow-Origin: *
```

Make sure to enable CORS in API Gateway for all resources.
