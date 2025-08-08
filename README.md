# Gmail Messages API & Phishing Detection System (Phishing-Hack Backend)

A Flask-based REST API for securely retrieving Gmail messages (via OAuth2) and classifying them as phishing or legitimate using an XGBoost‑powered machine learning pipeline.  
This README is expanded (compared to the original Backend/README.md) to emphasize: (1) LLM / AI evaluation integration paths, (2) security & open‑source tooling focus, and (3) terminal-first workflows for development and operations.

> Ethical Use Notice: This project is for defensive research, user awareness training, and educational experimentation. Do not analyze or process email content you are not legally authorized to access.

---

## Table of Contents
- [Core Overview](#core-overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Data & ML Pipeline](#data--ml-pipeline)
- [AI / LLM Evaluation Extensions](#ai--llm-evaluation-extensions)
- [Security & Open-Source Tooling Focus](#security--open-source-tooling-focus)
- [Terminal-Based Workflow Guide](#terminal-based-workflow-guide)
- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
- [Model Training & Evaluation](#model-training--evaluation)
- [Configuration & Environment](#configuration--environment)
- [Performance & Scaling](#performance--scaling)
- [Pluggable Components](#pluggable-components)
- [Testing Strategy](#testing-strategy)
- [Roadmap](#roadmap)
- [Contribution Guidelines](#contribution-guidelines)
- [Maintainer / Project Experience Alignment](#maintainer--project-experience-alignment)
- [FAQ](#faq)
- [License](#license)

---

## Core Overview
This backend unifies:
1. Gmail Message Retrieval (OAuth2 authenticated, token-driven).
2. Phishing Email Classification (feature-engineered + XGBoost).
3. Extensibility Hooks for LLM-based secondary analysis (optional future layer).
4. Terminal-friendly operations (training scripts, batch inference, evaluation harnesses).

---

## Key Features
| Category | Capabilities |
|----------|--------------|
| Email Ingestion | OAuth2 token-based access; structured extraction (id, subject, sender, date, snippet). |
| ML Classification | XGBoost model with TF-IDF + engineered numerical & categorical features. |
| Feature Engineering | URL counts, suspicious keyword flags, sender domain extraction, subject/body vectorization. |
| API Design | Simple JSON endpoints: health, message retrieval, (extendable) classification. |
| Evaluation | Precision / Recall / F1, confusion matrix scaffolding. |
| Extensibility | Planned LLM post-classification scoring; model versioning. |
| Security Posture | Token validation, sanitization, (planned) rate limiting & domain allow-lists. |
| Terminal Friendly | Virtual environment isolation, CLI scripts (proposed), reproducible pipelines. |

---

## Architecture
```
            +-------------------+
User Token ->  OAuth2 Validation |----+
            +-------------------+    |
                                      v
                             +------------------+
                             | Gmail API Client |
                             +------------------+
                                      |
                                      v
                            Raw Message Payloads
                                      |
                                      v
                 +---------------------------------------+
                 |  Parsing & Normalization Layer        |
                 +---------------------------------------+
                        |                         |
                        |                         v
                        |                 Feature Engineering
                        |                         |
                        v                         v
                +----------------+       +------------------+
                |  TF-IDF Vector |       |  Categorical /   |
                |  (Body/Subject)|       |  Numeric Features |
                +----------------+       +------------------+
                           \                /
                            \              /
                             \            /
                              v          v
                            +-------------+
                            |  Concatenate |
                            +-------------+
                                   |
                                   v
                           +----------------+
                           |  XGBoost Model |
                           +----------------+
                                   |
                                   v
                      JSON Classification Response
```

---

## Data & ML Pipeline

### Input Requirements
Columns: `body`, `label`, `urls`, `sender`, `subject` (loaded from multiple CSV sources).  
Cleaning: concatenation, NA removal, data type normalization.

### Feature Groups
| Group | Example Features |
|-------|------------------|
| Numerical | URL count, suspicious keyword presence (binary / counts) |
| Categorical | Sender domain (one-hot encoded) |
| Text | TF-IDF vectors (body: max 2000 features, subject: max 1000 features) |

### Vectorization Example (from existing backend logic)
```python
from sklearn.feature_extraction.text import TfidfVectorizer

body_vectorizer = TfidfVectorizer(stop_words='english', max_features=2000)
X_body = body_vectorizer.fit_transform(df['body'])

subject_vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
X_subject = subject_vectorizer.fit_transform(df['subject'])
```

### Model (XGBoost)
```python
from xgboost import XGBClassifier

model = XGBClassifier(
    use_label_encoder=False,
    eval_metric='logloss',
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1
)
model.fit(X_train, y_train)
```

### Output Structure
```json
{
  "prediction": 1,
  "probability": 0.87,
  "features_used": ["tfidf_body", "tfidf_subject", "url_count", "domain", "keywords"]
}
```

---

## AI / LLM Evaluation Extensions
While the current system uses a classical ML approach (XGBoost), the design accommodates LLM augmentation for:
1. Contextual Risk Explanation  
2. Multi-Stage Scoring (XGBoost -> LLM justification layer)  
3. Adversarial Prompt Testing (altered email phrasing robustness)  
4. Synthetic Sample Generation (augment minority class examples)

### Proposed LLM Integration Flow
```
Base Classification → Confidence Threshold → If borderline:
    → Build Prompt (features + raw normalized text)
    → LLM Reasoner (e.g., "Explain if this is phishing; output JSON {risk, rationale}")
    → Merge structured rationale into final API response
```

### Example Prompt Template
```
System: You are an email security analyst. Return JSON only.
User: Analyze the following email content and provide:
 - "risk_level": low|medium|high
 - "rationale": concise reason
 - "indicators": list of notable tokens or patterns
Email Subject: {{subject}}
Sender: {{sender}}
Body (truncated 1k chars): {{body_excerpt}}
```

### Evaluation Harness (Planned)
| Component | Purpose |
|-----------|---------|
| `eval/prompts/` | Store canonical prompt templates |
| `eval/corpus/` | Labeled messages set |
| `eval/run.py` | Batch scoring across providers |
| `eval/metrics.py` | Agreement vs. ground truth, calibration curves |

---

## Security & Open-Source Tooling Focus
| Vector | Current / Planned |
|--------|-------------------|
| OAuth2 Handling | Sanitized token structure; refresh handling (planned) |
| Input Validation | JSON schema enforcement (recommend using `pydantic`) |
| Domain Normalization | `tldextract` for canonical domain extraction |
| Abuse Mitigation | Planned rate limiting (Flask-Limiter) |
| Data Minimization | Strip extraneous headers before persistence |
| Model Integrity | Hash & version model artifacts (SHA256 manifest) |
| Dependency Hygiene | Pin versions; run `pip-audit` in CI |
| Logging | Structured JSON events for ingestion into SIEM |
| Privacy | Avoid persistent storage of full message bodies unless explicitly enabled |

---

## Terminal-Based Workflow Guide

### Environment Bootstrap
```bash
python -m venv venv
source venv/bin/activate          # Linux/macOS
# or: venv\Scripts\activate       # Windows
pip install -r requirements.txt
```

### Run Dev Server
```bash
python main.py
```

### Lint & Audit (suggested additions)
```bash
ruff check .
pip-audit
```

### Train / Retrain Model (example skeleton)
```bash
python scripts/train_model.py \
  --data data/*.csv \
  --out models/xgb_v1.bin \
  --vectorizers artifacts/vectorizers.pkl
```

### Batch Inference (planned)
```bash
python scripts/batch_infer.py \
  --model models/xgb_v1.bin \
  --input samples/raw_emails.jsonl \
  --out outputs/predictions.jsonl
```

### Log Filtering
```bash
jq 'select(.component=="classifier" and .level=="INFO")' app.log
```

---

## Quick Start
Prerequisites:
- Python 3.8+
- Gmail API credentials (OAuth2)
- `requirements.txt` installed

Install & Run:
```bash
git clone <repository-url>
cd gmail-phishing-detection   # adjust to actual folder if different
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```
Service at: http://localhost:5000

---

## API Endpoints

### Health
GET `/health`
```json
{
  "status": "healthy",
  "service": "Gmail Messages API"
}
```

### Retrieve Messages
POST `/get-messages/`
Request:
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

Success:
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

Error:
```json
{ "error": "Error description" }
```

cURL Example:
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

---

## Model Training & Evaluation

### Metrics
- Precision
- Recall
- F1-Score
- Confusion Matrix
- (Planned) ROC-AUC & calibration

### Example Objective Function (XGBoost)
```
Obj = Σ l(yi, ŷi) + Σ Ω(fk)
```
Where `l` = log-loss, `Ω` = tree regularization term.

### Performance Targets (Empirical / Provided)
| Metric | Typical |
|--------|---------|
| Accuracy | > 0.98 (balanced datasets) |
| Prediction Latency | < 100 ms / email |
| Train Time (100K rows) | 5–10 min |

---

## Configuration & Environment
| Variable | Purpose |
|----------|---------|
| `APP_ENV` | `dev`, `prod`, etc. |
| `LOG_LEVEL` | `INFO`, `DEBUG` |
| `MODEL_PATH` | Path to model artifact |
| `VECTORIZERS_PATH` | Path to serialized vectorizers |
| `FEATURE_FLAGS` | Comma list (e.g. `LLM_EVAL,BATCH_EXPORT`) |

---

## Performance & Scaling
| Concern | Strategy |
|---------|----------|
| Horizontal Scale | Run multiple Flask workers behind a WSGI (gunicorn + nginx) |
| Batch Inference | Pre-vectorize & cache |
| Model Versioning | Semantic artifact naming (`xgb_vMAJOR_MINOR.bin`) |
| Caching | Keep TF-IDF vectorizers in memory after first load |

---

## Pluggable Components
| Component | Extension Path |
|-----------|----------------|
| Vectorizers | Replace TF-IDF with embeddings (e.g. SBERT) |
| Classifier | Swap XGBoost for LightGBM / CatBoost / LLM scoring wrapper |
| Post-Processor | Add risk explanation (LLM or rule-based) |
| Storage (if added) | Persist classification history in SQLite/Postgres |

---

## Testing Strategy
| Layer | Focus | Tooling |
|-------|-------|---------|
| Unit | Token parsing, feature extraction | `pytest` |
| Integration | Endpoints + model load | `pytest + requests` |
| Performance | Latency under concurrency | `locust` (optional) |
| Security | Dependency & static analysis | `pip-audit`, `bandit` |
| LLM Eval (planned) | Drift / agreement tests | custom harness |

---

## Roadmap
- [ ] Add `/classify` endpoint for individual message scoring
- [ ] Model artifact version registry
- [ ] LLM rationale augmentation (optional flag)
- [ ] Embedding-based phishing similarity search
- [ ] Active learning loop (human feedback → incremental retrain)
- [ ] Real-time streaming classification (websocket)
- [ ] RBAC / API keys
- [ ] Rate limiting & abuse detection
- [ ] Prompt evaluation harness (multi-model)

---

## Contribution Guidelines
1. Fork + feature branch naming: `feat/<short-name>` or `fix/<short-name>`
2. Use Conventional Commits (`feat:`, `fix:`, `docs:`, `sec:`)
3. Provide:
   - Summary
   - Security impact (if any)
   - Test evidence (paste output or attach screenshot)
4. Run quality gate before PR:
```bash
pytest -q
ruff check .
pip-audit
```
5. Larger architectural changes should include an ADR in `docs/adr/`.

---

## Maintainer / Project Experience Alignment
This project highlights:
| Focus Area | Alignment |
|------------|-----------|
| LLM / AI Evaluation | Clear integration path for layered reasoning, prompt templates, and evaluation harness design. |
| Security Tooling | Implements phishing detection pipeline fundamentals; structured path to add threat modeling, logging, artifact integrity. |
| Terminal Workflows | Emphasis on venv isolation, CLI scripts, reproducible training, log parsing (`jq`), and audit/report generation. |

---

## FAQ
| Question | Answer |
|----------|--------|
| Is Gmail scope limited? | Use least-privilege OAuth scopes; avoid full mailbox read if not required. |
| Can I swap the model? | Yes—keep interface: `predict(X) -> (label, probability)` |
| Do I need an LLM key now? | No. LLM integration is optional future/advanced functionality. |
| How to avoid PII retention? | Do not persist raw bodies; store hashed fields or derived features only. |
| Dataset imbalance? | Use class weighting or SMOTE; evaluate via precision/recall, not accuracy alone. |

---

## License
MIT (see LICENSE file)

---

## Acknowledgments
- Open-source ML ecosystem (scikit-learn, XGBoost)
- Email security research community
- Contributors focusing on ethical defensive tooling

---

Happy to accept focused PRs that improve security posture, evaluation rigor, or terminal operability.
