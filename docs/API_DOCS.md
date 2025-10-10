# API Documentation

Complete API reference for the PM Interview Practice backend.

**Base URL**: `http://localhost:4000` (development)

**Authentication**: JWT Bearer token in `Authorization` header

---

## Table of Contents

1. [Authentication](#authentication)
2. [Interview Flow](#interview-flow)
3. [Payments](#payments)
4. [Admin](#admin)
5. [Error Responses](#error-responses)
6. [Rate Limits](#rate-limits)

---

## Authentication

### Register User

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Validation:**

- `email`: Valid email format, required
- `password`: Minimum 8 characters, required

**Success Response:** `201 Created`

```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

- `400 Bad Request`: Validation failed or email already exists
- `429 Too Many Requests`: Rate limit exceeded (5 requests per 15 minutes)

**Example:**

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'
```

---

### Login User

Authenticate and receive JWT token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Success Response:** `200 OK`

```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

- `401 Unauthorized`: Invalid credentials
- `429 Too Many Requests`: Rate limit exceeded

**Example:**

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@pmpractice.com","password":"Demo123456!"}'
```

---

## Interview Flow

### Start Interview

Get a random interview question for the specified level.

**Endpoint:** `POST /api/start-interview`

**Authentication:** Required

**Request Body:**

```json
{
  "level": "mid"
}
```

**Parameters:**

- `level`: One of `junior`, `mid`, or `senior` (required)

**Success Response:** `200 OK`

```json
{
  "id": 3,
  "text": "Design a product that helps remote teams collaborate more effectively.",
  "category": "product_design",
  "level": "mid"
}
```

**Error Responses:**

- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: No questions available for level

**Example:**

```bash
curl -X POST http://localhost:4000/api/start-interview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"level":"mid"}'
```

---

### Submit Answer

Submit an answer to a question and create a session.

**Endpoint:** `POST /api/submit-answer`

**Authentication:** Required

**Request Body:**

```json
{
  "questionId": 3,
  "answerText": "I would approach this using the CIRCLES framework..."
}
```

**Parameters:**

- `questionId`: Integer, required
- `answerText`: String, minimum 10 characters, required
- `sessionId`: Integer, optional (for updating existing session)

**Success Response:** `201 Created`

```json
{
  "sessionId": 1,
  "message": "Answer submitted successfully"
}
```

**Error Responses:**

- `400 Bad Request`: Validation failed
- `404 Not Found`: Question not found

**Example:**

```bash
curl -X POST http://localhost:4000/api/submit-answer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "questionId": 3,
    "answerText": "Using the CIRCLES framework: Customer - remote teams 5-50 people. Problem Report - inefficient async communication. Use Cases - daily standups, sprint planning. Prioritize - centralized dashboard with team availability. Solutions - real-time presence, threaded conversations. Metrics - DAU, response time, tasks completed. Evaluation - A/B testing notification strategies."
  }'
```

---

### Score Answer

Get AI-powered scoring for a submitted answer.

**Endpoint:** `POST /api/score`

**Authentication:** Required

**Rate Limit:** 10 requests per hour

**Request Body:**

```json
{
  "sessionId": 1
}
```

**Parameters:**

- `sessionId`: Integer, required

**Success Response:** `200 OK`

```json
{
  "message": "Session scored successfully",
  "score": {
    "id": 1,
    "sessionId": 1,
    "structure": 8,
    "metrics": 7,
    "prioritization": 9,
    "userEmpathy": 8,
    "communication": 7,
    "feedback": "• Strong use of CIRCLES framework\n• Good metric selection with DAU and response time\n• Could improve by discussing edge cases and failure modes",
    "sampleAnswer": "Using CIRCLES: Customer segment is remote-first companies with 10-100 employees...",
    "totalScore": 8,
    "status": "completed",
    "tokensUsed": 856,
    "createdAt": "2024-01-15T10:35:00.000Z"
  }
}
```

**Score Breakdown:**

- `structure` (0-10): Framework usage and logical flow
- `metrics` (0-10): Quality and relevance of metrics
- `prioritization` (0-10): Feature/problem prioritization
- `userEmpathy` (0-10): Understanding of user needs
- `communication` (0-10): Clarity and articulation
- `totalScore`: Average of all scores
- `feedback`: 2-3 bullet points of constructive feedback
- `sampleAnswer`: Example demonstrating best practices

**Error Responses:**

- `404 Not Found`: Session not found
- `403 Forbidden`: Unauthorized (not your session)
- `429 Too Many Requests`: Scoring rate limit exceeded
- `500 Internal Server Error`: OpenAI API failure (session flagged for review)

**Example:**

```bash
curl -X POST http://localhost:4000/api/score \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"sessionId": 1}'
```

---

### Get Sessions

List all sessions for authenticated user.

**Endpoint:** `GET /api/sessions`

**Authentication:** Required

**Success Response:** `200 OK`

```json
{
  "sessions": [
    {
      "id": 1,
      "userId": 1,
      "questionId": 3,
      "answerText": "Using the CIRCLES framework...",
      "status": "scored",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "question": {
        "text": "Design a product for remote teams...",
        "category": "product_design",
        "level": "mid"
      },
      "scores": {
        "totalScore": 8,
        "structure": 8,
        "metrics": 7,
        "prioritization": 9,
        "userEmpathy": 8,
        "communication": 7
      }
    }
  ]
}
```

**Example:**

```bash
curl -X GET http://localhost:4000/api/sessions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Get Session by ID

Get detailed session information including full transcript and scorecard.

**Endpoint:** `GET /api/sessions/:id`

**Authentication:** Required

**Parameters:**

- `id`: Session ID (path parameter)

**Success Response:** `200 OK`

```json
{
  "session": {
    "id": 1,
    "userId": 1,
    "questionId": 3,
    "answerText": "Full answer text...",
    "transcript": null,
    "status": "scored",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z",
    "question": {
      "id": 3,
      "text": "Design a product for remote teams...",
      "category": "product_design",
      "level": "mid",
      "difficulty": 6
    },
    "scores": {
      "structure": 8,
      "metrics": 7,
      "prioritization": 9,
      "userEmpathy": 8,
      "communication": 7,
      "feedback": "• Strong framework usage...",
      "sampleAnswer": "Using CIRCLES...",
      "totalScore": 8
    }
  }
}
```

**Error Responses:**

- `403 Forbidden`: Unauthorized access to session
- `404 Not Found`: Session not found

**Example:**

```bash
curl -X GET http://localhost:4000/api/sessions/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Payments

### Create Checkout Session

Create a Stripe Checkout session for subscription.

**Endpoint:** `POST /api/create-checkout-session`

**Authentication:** Required

**Request Body:**

```json
{
  "subscriptionType": "basic"
}
```

**Parameters:**

- `subscriptionType`: One of `basic` ($29/month) or `premium` ($49/month)

**Success Response:** `200 OK`

```json
{
  "sessionId": "cs_test_a1b2c3...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

**Usage:**
Redirect user to the `url` to complete payment.

**Example:**

```bash
curl -X POST http://localhost:4000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"subscriptionType":"basic"}'
```

---

### Stripe Webhook

Receives Stripe webhook events for payment processing.

**Endpoint:** `POST /api/webhook/stripe`

**Authentication:** Stripe signature verification

**Handled Events:**

- `checkout.session.completed`: Payment successful
- `customer.subscription.deleted`: Subscription cancelled

**Note:** This endpoint is called by Stripe, not by your frontend.

---

## Admin

All admin endpoints require user with `role: "admin"`.

### Get Flagged Sessions

List sessions that need manual review (scoring failed).

**Endpoint:** `GET /api/admin/flagged-sessions`

**Authentication:** Required (Admin only)

**Success Response:** `200 OK`

```json
{
  "count": 2,
  "sessions": [
    {
      "id": 5,
      "userId": 3,
      "status": "needs_review",
      "user": {
        "id": 3,
        "email": "user@example.com"
      },
      "question": {
        "text": "Question text...",
        "category": "strategy",
        "level": "senior"
      },
      "scores": {
        "status": "needs_review",
        "feedback": "Automated scoring failed. Flagged for manual review."
      }
    }
  ]
}
```

**Example:**

```bash
curl -X GET http://localhost:4000/api/admin/flagged-sessions \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### Get Metrics

View system metrics and usage statistics.

**Endpoint:** `GET /api/admin/metrics`

**Authentication:** Required (Admin only)

**Query Parameters:**

- `days`: Number of days to look back (default: 7)

**Success Response:** `200 OK`

```json
{
  "period": "Last 7 days",
  "metrics": {
    "totalTokensUsed": 45620,
    "totalSessions": 127,
    "scoredSessions": 115,
    "flaggedSessions": 3,
    "newUsers": 28,
    "revenue": 145.0
  }
}
```

**Example:**

```bash
curl -X GET "http://localhost:4000/api/admin/metrics?days=30" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message here",
  "details": ["Additional context (optional)"]
}
```

### Common HTTP Status Codes

- `200 OK`: Success
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## Rate Limits

| Endpoint              | Limit        | Window     |
| --------------------- | ------------ | ---------- |
| General API           | 100 requests | 15 minutes |
| Auth (register/login) | 5 requests   | 15 minutes |
| Scoring               | 10 requests  | 1 hour     |

**Rate Limit Headers:**

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1705320000
```

---

## Health Check

**Endpoint:** `GET /api/health`

**Authentication:** Not required

**Success Response:** `200 OK`

```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## OpenAI Integration Details

### Scoring Prompt

The system uses a carefully crafted prompt with GPT-4 Turbo to ensure consistent, high-quality feedback.

**Key Features:**

- Low temperature (0.2) for consistency
- JSON mode for structured responses
- Explicit scoring criteria (structure, metrics, prioritization, empathy, communication)
- 2-3 bullet points of actionable feedback
- Sample answer demonstrating best practices

**Token Usage:**

- Average: 800 tokens per request (~300 input, ~500 output)
- Cost: ~$0.01-0.02 per scoring request

**Retry Logic:**

- Up to 2 retries on parsing failures
- Exponential backoff between retries
- Sessions flagged for manual review if all attempts fail

---

## Postman Collection

Import this JSON to get started with Postman:

```json
{
  "info": {
    "name": "PM Interview Practice API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{jwt_token}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:4000"
    },
    {
      "key": "jwt_token",
      "value": ""
    }
  ]
}
```

---

**For more information, see [README.md](./README.md)**
