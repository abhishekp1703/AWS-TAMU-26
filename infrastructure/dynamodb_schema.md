# AXIS — DynamoDB Schema

---

## Table 1: axis-interviews

**Primary Key:** interview_id (String)

| Field | Type | Description |
|-------|------|-------------|
| interview_id | String (PK) | 8-char uppercase UUID e.g. "A1B2C3D4" |
| company_name | String | e.g. "H-E-B" |
| sector | String | e.g. "retail", "energy", "technology" |
| created_at | String | Unix timestamp |
| elapsed_seconds | String | How long pipeline took |
| status | String | "pending_interviewee_response" or "interviewee_responded" |
| brief_s3_key | String | S3 path to interviewer brief |
| packet_s3_key | String | S3 path to interviewee packet |
| questions_s3_key | String | S3 path to full questions JSON |
| interviewee_facts | List | 5 facts sent to interviewee |
| interviewee_questions | List | 5 questions sent to interviewee |
| interviewee_corrections | List | What they flagged as wrong |
| interviewee_selected_questions | List | Questions they selected |
| interviewee_wildcard | String | Their unprompted insight |
| responded_at | String | Unix timestamp of their response |
| post_interview_debrief | Map | Post-interview insights (future) |

---

## Table 2: axis-institutional-memory

**Primary Key:** sector (String) + interview_id (String)

| Field | Type | Description |
|-------|------|-------------|
| sector | String (PK) | e.g. "retail", "energy" |
| interview_id | String (SK) | Links to axis-interviews |
| company_name | String | Company that was interviewed |
| key_insights | String | What we learned |
| questions_that_worked | List | Questions that got great responses |
| surprises | String | What the AI got wrong or missed |
| recurring_themes | List | Patterns in this sector |
| created_at | String | Unix timestamp |

---

## S3 Structure

```
axis-interviews-[teamname]/
  {interview_id}/
    interviewer_brief.txt    ← Full 2-3 page brief
    interviewee_packet.txt   ← 1 page for the executive
    questions.json           ← Structured questions with rationale
    gaps.json                ← Knowledge gaps analysis
    raw_profile.json         ← Company profile from Call 1
```
