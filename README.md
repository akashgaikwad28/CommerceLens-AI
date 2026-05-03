
#  CommerceLens AI  
### AI-powered Review Intelligence + AEO (AI Engine Optimization) Diagnostic for eCommerce

> Understand **why customers buy**, and whether **AI recommends your product**.

---

## 📌 Overview

CommerceLens AI is a developer-first, AI-powered analytics platform designed for modern eCommerce sellers.

It combines:

- 🧠 **Review Analytics Engine** → Extracts deep insights from customer reviews  
- 🔍 **AEO Diagnostic Engine** → Evaluates how AI models (GPT, Gemini, etc.) rank your product  

This project demonstrates how **AI agents + data pipelines** can automate growth insights for online businesses.

---

## 🎯 Problem Statement

eCommerce sellers struggle with:

- ❌ Understanding *why customers buy or churn*
- ❌ Extracting insights from hundreds of reviews
- ❌ Knowing how AI search engines perceive their product
- ❌ Keeping up with AI-driven discovery (ChatGPT, Gemini, etc.)

---

## 💡 Solution

CommerceLens AI solves this by:

### 1. Review Intelligence
- Scrapes product reviews
- Uses AI to extract:
  - ✅ Buying triggers
  - ❌ Pain points
  - 📊 Sentiment score
  - 🛠 Improvement suggestions

### 2. AEO (AI Engine Optimization)
- Queries multiple LLMs
- Evaluates:
  - 🧠 Product visibility
  - 🏆 Competitor mentions
  - 📉 Missed ranking opportunities

---

## 🏗️ Architecture

```

Client / API User
↓
FastAPI Backend
↓
-

| Review Engine                 |
| AEO Engine                    |
| Scraper Layer                 |
| AI Processing Layer           |
---------------------------------

```
    ↓
```

SQLite / JSON Storage

```

---

## ⚙️ Tech Stack

### Backend
- FastAPI
- Python 3.11+

### AI Integration
- OpenAI API
- (Optional) Gemini API

### Data Processing
- BeautifulSoup / Playwright (Scraping)
- Pydantic (Validation)

### Storage
- SQLite (default)
- JSON (fallback)

### DevOps
- Docker
- Uvicorn
- GitHub

---

## 📁 Project Structure

```

commerce-lens-ai/
│
├── app/
│   ├── main.py
│   ├── api/v1/
│   ├── core/
│   ├── services/
│   ├── models/
│   ├── db/
│   ├── utils/
│
├── tests/
├── scripts/
├── data/
├── README.md
├── requirements.txt
├── Dockerfile

```

---

## 🚀 Features

### 🔥 Core Features

- 📊 Review sentiment analysis
- 🧠 AI-powered insight extraction
- ⚔️ Competitor comparison (basic)
- 🔍 AI search visibility scoring
- 📈 Improvement recommendations

---

### 💎 Advanced Features

- Multi-LLM querying (GPT + Gemini)
- Retry & fault tolerance system
- Modular service architecture
- Open-source contributor friendly design

---

## 🧪 API Endpoints

### 🟢 Health Check

```

GET /api/v1/health

```

---

### 📊 Analyze Reviews

```

POST /api/v1/review/analyze

````

#### Request:
```json
{
  "product_url": "https://amazon.in/example-product"
}
````

#### Response:

```json
{
  "product": "Example Product",
  "sentiment_score": 8.2,
  "top_positive": ["Good quality", "Affordable"],
  "top_negative": ["Slow delivery"],
  "improvements": ["Improve logistics"]
}
```

---

### 🔍 AEO Diagnostic

```
POST /api/v1/aeo/analyze
```

#### Request:

```json
{
  "query": "best whey protein",
  "product_name": "Brand X Protein"
}
```

#### Response:

```json
{
  "visibility_score": 6.5,
  "mentioned": true,
  "competitors": ["Brand Y", "Brand Z"],
  "suggestions": ["Improve branding keywords"]
}
```

---

## ⚡ Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/commerce-lens-ai.git
cd commerce-lens-ai
```

---

### 2. Setup environment

```bash
cp .env.example .env
```

Add your API key:

```
OPENAI_API_KEY=your_api_key_here
```

---

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

---

### 4. Run the server

```bash
uvicorn app.main:app --reload
```

---

### 5. Open API docs

```
http://localhost:8000/docs
```

---

## 🐳 Docker Setup (Optional)

```bash
docker build -t commerce-lens .
docker run -p 8000:8000 commerce-lens
```

---

## 🛡️ Fault Tolerance

* 🔁 Retry mechanism for scraping failures
* ⚠️ Graceful fallback if AI API fails
* ✅ Input validation for URLs
* 🧾 Structured logging

---

## 🧪 Testing

```bash
pytest
```

---

## 📊 Future Improvements

* Full competitor benchmarking
* UI dashboard (React / Next.js)
* Real-time analytics
* Chrome extension for sellers
* Shopify integration
* Advanced AEO scoring model

---

## 🤝 Contributing

We welcome contributions!

### Steps:

1. Fork the repo
2. Create a new branch
3. Make your changes
4. Submit a PR

---

### Contribution Areas

* Scraper improvements (Amazon, Flipkart)
* Multi-model AI integration
* Performance optimization
* UI/UX enhancements

---

## 📜 License

MIT License

---

## 🙌 Acknowledgements

* OpenAI for LLM APIs
* FastAPI community
* Open-source contributors

---

## 👨‍💻 Author

**Your Name**

* GitHub: [https://github.com/your-username](https://github.com/your-username)
* LinkedIn: [https://linkedin.com/in/your-profile](https://linkedin.com/in/your-profile)

---

## 🎬 Demo

👉 Add your demo video link here

---

## ⭐ Final Note

This project is built to demonstrate:

* Product thinking
* AI system design
* Real-world problem solving

> Not just code — but building something users actually need.

---

```

---

# 🚀 What you should do next

1. Replace:
   - `your-username`
   - `your name`
   - links

2. Add:
   - Demo video link
   - GitHub repo link

---

If you want next level polish, say:

👉 “:contentReference[oaicite:0]{index=0}”

I’ll turn this into something that feels like a **startup landing page + pitch doc combined** 😄
```
