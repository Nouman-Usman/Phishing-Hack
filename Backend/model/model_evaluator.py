import joblib
import numpy as np
import tldextract
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from scipy.sparse import hstack
import warnings

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

model = joblib.load('phishing_model.pkl')
body_vectorizer = joblib.load('body_vectorizer.pkl')
subject_vectorizer = joblib.load('subject_vectorizer.pkl')
sender_enc = joblib.load('sender_encoder.pkl')

def extract_url_count(urls):
    return len(str(urls).split(','))

def extract_sender_domain(sender):
    ext = tldextract.extract(str(sender))
    return ext.domain + '.' + ext.suffix if ext.domain else 'unknown'

def contains_suspicious_keywords(text):
    suspicious_keywords = ['urgent', 'verify', 'click', 'account', 'login', 'password', 'bank', 'suspend']
    text = str(text).lower()
    return int(any(word in text for word in suspicious_keywords))


def get_model_evaluation(body, subject, urls, sender):
    """Evaluate the model with the provided email features."""
    url_count = extract_url_count(urls)
    suspicious = contains_suspicious_keywords(body)
    sender_domain = extract_sender_domain(sender)
    X_body = body_vectorizer.transform([body])
    X_subject = subject_vectorizer.transform([subject])
    X_sender = sender_enc.transform([[sender_domain]])
    X_misc = np.array([[url_count, suspicious]])
    X_test = hstack([X_body, X_subject, X_sender, X_misc])
    prediction = model.predict(X_test)[0]
    proba = model.predict_proba(X_test)[0]
    if prediction == 1:
        prediction = "Phishing"
    else:
        prediction = "Legitimate"

    return prediction, proba

if __name__ == "__main__":
    # Example usage
    body = "Dear user, your account has been suspended. Please click here to verify."
    subject = "Account Suspended Urgently"
    urls = "http://malicious-site.com/verify,https://phishing.com/login"
    sender = "unknown@malicious.com"
    data = get_model_evaluation(body, subject, urls, sender)
    print("Prediction:", data[0])
