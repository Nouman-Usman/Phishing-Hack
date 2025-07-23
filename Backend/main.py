import os.path
import json
from flask import Flask, request, jsonify
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import base64
import re
from model.model_evaluator import get_model_evaluation

# If modifying these scopes, delete the file token.json.
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

app = Flask(__name__)
# allow CORS for all routes
@app.after_request
def after_request(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    return response

def get_gmail_messages_ids(token_data, query_params=None, user_id="me"):
    """Lists messages in the user's mailbox.

    Args:
        token_data (dict): Token data containing access token and other OAuth2 credentials
        query_params (dict, optional): Query parameters for listing messages (e.g., maxResults, pageToken, q, labelIds, includeSpamTrash)
        user_id (str, optional): The ID of the user whose messages are to be retrieved. Defaults to "me".
        
    Returns:
        dict: Response containing messages (id, threadId), nextPageToken, resultSizeEstimate, or error information
    """
    try:
        # Use only access_token and token_type for Credentials
        creds = Credentials(
            token=token_data.get("access_token"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=token_data.get("client_id"),
            client_secret=token_data.get("client_secret"),
            scopes=SCOPES
        )
        if not creds.valid or creds.expired:
            return {"error": "Access token is invalid or expired. Please re-authenticate to obtain a new access token."}

        service = build("gmail", "v1", credentials=creds)
        list_args = {
            "userId": user_id
        }
        if query_params:
            if "labelIds" in query_params:
                list_args["labelIds"] = query_params["labelIds"]
            if "maxResults" in query_params:
                list_args["maxResults"] = query_params["maxResults"]
            if "pageToken" in query_params:
                list_args["pageToken"] = query_params["pageToken"]
            if "q" in query_params:
                list_args["q"] = query_params["q"]
            if "includeSpamTrash" in query_params:
                list_args["includeSpamTrash"] = query_params["includeSpamTrash"]

        results = service.users().messages().list(**list_args).execute()
        messages = results.get("messages", [])
        next_page_token = results.get("nextPageToken")
        result_size_estimate = results.get("resultSizeEstimate")
        messages_summary = []
        for msg in messages:
            messages_summary.append({
                "id": msg.get("id"),
                "threadId": msg.get("threadId")

            })
        return {
            "messages": messages_summary,
            "nextPageToken": next_page_token,
            "resultSizeEstimate": result_size_estimate
        }

    except HttpError as error:
        print(f"An error occurred: {error}")
        return {"error": f"Gmail API error: {str(error)}"}
    except Exception as error:
        print(f"An error occurred in this line: {error}")
        return {"error": f"An error occurred : {str(error)}"}

def get_messages_by_ids(token_data, message_ids, user_id="me"):
    """Fetches specific messages by their IDs.

    Args:
        token_data (dict): Token data containing access token and other OAuth2 credentials
        message_ids (list): List of message IDs to retrieve
        user_id (str, optional): The ID of the user whose messages are to be retrieved. Defaults to "me".

    Returns:
        dict: Response containing the requested messages or error information
    """
    try:
        creds = Credentials(
            token=token_data.get("access_token"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=token_data.get("client_id"),
            client_secret=token_data.get("client_secret"),
            scopes=SCOPES
        )

        if not creds.valid or creds.expired:
            return {"error": "Access token is invalid or expired. Please re-authenticate to obtain a new access token."}

        service = build("gmail", "v1", credentials=creds)
        messages = []

        for msg_id in message_ids:
            msg = service.users().messages().get(userId=user_id, id=msg_id, format='full').execute()
            payload = msg.get('payload', {})
            headers = payload.get('headers', [])
            body = ""
            subject = ""
            sender_name = ""
            sender_email = ""
            urls = []

            # Extract subject, sender name, and sender email
            for header in headers:
                if header['name'].lower() == 'subject':
                    subject = header['value']
                elif header['name'].lower() == 'from':
                    from_value = header['value']
                    # Parse sender name and email
                    if '<' in from_value and '>' in from_value:
                        sender_name = from_value.split('<')[0].strip().strip('"')
                        sender_email = from_value.split('<')[1].split('>')[0].strip()
                    else:
                        sender_email = from_value.strip()

            # Extract body (text/plain or text/html)
            def get_body_from_parts(parts):
                for part in parts:
                    if part.get('mimeType') == 'text/plain' and part.get('body', {}).get('data'):
                        return part['body']['data']
                    elif part.get('mimeType') == 'text/html' and part.get('body', {}).get('data'):
                        return part['body']['data']
                    elif 'parts' in part:
                        result = get_body_from_parts(part['parts'])
                        if result:
                            return result
                return None

            raw_body = None
            if 'parts' in payload:
                raw_body = get_body_from_parts(payload['parts'])
            elif payload.get('body', {}).get('data'):
                raw_body = payload['body']['data']

            if raw_body:
                body = base64.urlsafe_b64decode(raw_body).decode('utf-8', errors='replace')

            # Extract URLs from body
            urls = re.findall(r'(https?://[^\s]+)', body)

            result = {
                "id": msg_id,
                "subject": subject,
                "sender_name": sender_name,
                "sender_email": sender_email,
                "body": body,
                "urls": urls
            }
            messages.append(result)
        return {"messages": messages}

    except HttpError as error:
        print(f"An error occurred: {error}")
        return {"error": f"Gmail API error: {str(error)}"}
    except Exception as error:
        print(f"An error occurred in this line: {error}")
        return {"error": f"An error occurred : {str(error)}"}

@app.route('/get-messages/', methods=['POST'])
def get_messages():
    try:
        data = request.get_json()
        print("Received data:", data)
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        token_data = data.get('token')
        if not token_data:
            return jsonify({"error": "Token is required"}), 400

        # Flatten nested token if present
        if isinstance(token_data, dict) and 'token' in token_data and isinstance(token_data['token'], dict):
            token_data = token_data['token']

        if not isinstance(token_data, dict):
            return jsonify({"error": "Token must be a JSON object"}), 400

        required_fields = ['access_token', 'token_type']
        missing_fields = [field for field in required_fields if field not in token_data]
        if missing_fields:
            return jsonify({"error": f"Missing required token fields: {', '.join(missing_fields)}"}), 400

        # Collect query params efficiently
        query_keys = ["maxResults", "pageToken", "q", "labelIds", "includeSpamTrash"]
        query_params = {key: data.get(key, data.get(key.lower())) for key in query_keys if data.get(key, data.get(key.lower())) is not None}

        # Get userId from frontend, default to "me"
        user_id = token_data.get("userId", "me")
        print("User Id is:", user_id)
        result = get_gmail_messages_ids(token_data, query_params if query_params else None, user_id)
        if "error" in result:
            return jsonify(result), 400

        message_ids = [msg['id'] for msg in result.get('messages', [])]
        if not message_ids:
            return jsonify({"summary": result, "details": {"messages": []}}), 200
        print("************************************************************************")
        messages_detail = get_messages_by_ids(token_data, message_ids, user_id)
        if "messages" in messages_detail and messages_detail["messages"]:
            print("Messages detail fetched successfully.", messages_detail["messages"][1])
        else:
            print("Messages detail fetched successfully.", messages_detail)
        if "error" in messages_detail:
            return jsonify(messages_detail), 400
        print(f"Retrieved {len(messages_detail.get('messages', []))} messages.")
        return jsonify({
            "messages": messages_detail["messages"],
        }), 200

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/check_emails', methods=['POST'])
def check_emails():
    """Endpoint to check emails and evaluate phishing risk."""
    try:
        data = request.get_json()
        if not data or not isinstance(data, dict):
            return jsonify({"error": "Invalid input data"}), 400
        body = data.get('body')
        subject = data.get('subject')
        urls = data.get('urls', '')
        sender = data.get('sender', '')
        if not body or not subject or not sender:
            return jsonify({"error": "Body, subject, and sender are required"}), 400
        prediction, proba = get_model_evaluation(body, subject, urls, sender)
        return jsonify({
            "prediction": prediction,
            "probability": proba.tolist()  # Convert numpy array to list for JSON serialization
        }), 200
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500
@app.route('/check-phishing', methods=['POST'])
def check_phishing():
    """Alias endpoint for phishing risk evaluation (same as /check_emails)."""
    try:
        data = request.get_json()
        if not data or not isinstance(data, dict):
            return jsonify({"error": "Invalid input data"}), 400
        body = data.get('body')
        subject = data.get('subject')
        urls = data.get('urls', '')
        sender = data.get('sender', '')
        if not body or not subject or not sender:
            return jsonify({"error": "Body, subject, and sender are required"}), 400
        prediction, proba = get_model_evaluation(body, subject, urls, sender)
        return jsonify({
            "prediction": prediction,
            "probability": proba.tolist()
        }), 200
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "healthy", "service": "Gmail Messages API"}), 200


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)