# Required libraries
import pandas as pd
import glob
import os
import numpy as np
import tldextract
import re
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import OneHotEncoder
from sklearn.metrics import classification_report, confusion_matrix
from scipy.sparse import hstack
import matplotlib.pyplot as plt
import seaborn as sns
import shap
from xgboost import XGBClassifier

data_path = "/kaggle/input/phishing-email-dataset"  
csv_files = glob.glob(os.path.join(data_path, "*.csv"))
df_list = [pd.read_csv(file) for file in csv_files]
df = pd.concat(df_list, ignore_index=True)
df = df[['body', 'label', 'urls', 'sender', 'subject']].dropna()

def extract_url_count(text):
    return len(str(text).split(','))

def extract_sender_domain(sender):
    ext = tldextract.extract(str(sender))
    return ext.domain + '.' + ext.suffix if ext.domain else 'unknown'

def contains_suspicious_keywords(text):
    suspicious_keywords = ['urgent', 'verify', 'click', 'account', 'login', 'password', 'bank', 'suspend']
    text = str(text).lower()
    return any(word in text for word in suspicious_keywords)

df['url_count'] = df['urls'].apply(extract_url_count)
df['sender_domain'] = df['sender'].apply(extract_sender_domain)
df['suspicious_keywords'] = df['body'].apply(contains_suspicious_keywords).astype(int)

body_vectorizer = TfidfVectorizer(stop_words='english', max_features=2000)
subject_vectorizer = TfidfVectorizer(stop_words='english', max_features=300)
X_body = body_vectorizer.fit_transform(df['body'])
X_subject = subject_vectorizer.fit_transform(df['subject'])

sender_enc = OneHotEncoder(handle_unknown='ignore', sparse=True)
X_sender = sender_enc.fit_transform(df[['sender_domain']])
X_misc = np.array(df[['url_count', 'suspicious_keywords']])

X_combined = hstack([X_body, X_subject, X_sender, X_misc])
y = df['label'].astype(int)

X_train, X_test, y_train, y_test = train_test_split(X_combined, y, test_size=0.2, stratify=y, random_state=42)

model = XGBClassifier(use_label_encoder=False, eval_metric='logloss', n_estimators=100, max_depth=6, learning_rate=0.1)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
report = classification_report(y_test, y_pred, output_dict=True)
cm = confusion_matrix(y_test, y_pred)

(report, cm)