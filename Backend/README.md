# Gmail Messages Flask API

This Flask API provides an endpoint to retrieve Gmail messages using OAuth2 tokens.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the Flask application:
```bash
python main.py
```

The API will be available at `http://localhost:5000`

## API Endpoints

### POST /get-messages/

Retrieves Gmail messages from the user's inbox.

**Request Body:**
```json
{
  "token": {
    "access_token": "your_access_token_here",
    "token_type": "Bearer",
    "refresh_token": "your_refresh_token_here",
    "client_id": "your_client_id_here",
    "client_secret": "your_client_secret_here"
  }
}
```

**Response:**
```json
{
  "messages": [
    {
      "id": "message_id",
      "subject": "Email Subject",
      "from": "sender@example.com",
      "date": "Mon, 23 Jul 2025 10:30:00 +0000",
      "snippet": "Preview of email content..."
    }
  ],
  "count": 10,
  "total_available": 50
}
```

**Error Response:**
```json
{
  "error": "Error description"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "Gmail Messages API"
}
```

## Usage Example

```bash
curl -X POST http://localhost:5000/get-messages/ \
  -H "Content-Type: application/json" \
  -d '{
    "token": {
      "access_token": "your_access_token",
      "token_type": "Bearer",
      "refresh_token": "your_refresh_token",
      "client_id": "your_client_id",
      "client_secret": "your_client_secret"
    }
  }'
```

## Notes

- The API returns up to 10 messages for performance reasons
- Token refresh is handled automatically if the token is expired
- Make sure you have the proper Gmail API credentials set up
- The token should include all necessary OAuth2 fields for Google API authentication
