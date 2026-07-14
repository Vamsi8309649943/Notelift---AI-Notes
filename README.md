# Notelift — AI-Powered Meeting Intelligence

Notelift is a premium SaaS application that transforms raw, messy meeting transcripts into clean, highly structured, and actionable meeting notes. Powered by the Llama 3.3 70B model via Groq, Notelift automates the tedious post-meeting documentation process—extracting summaries, action items with assignees, key decisions, risks, technical terms, and more.

It features a full authentication flow, automated history logging, inline nested editing of all sections, PDF exports, and a test-mode Stripe subscription billing portal.

---

## 🚀 Key Features

* **AI Summarization Pipeline:** Multi-stage summarization with prompt-injection defense and a rolling context merger for long transcripts.
* **Granular Editing & Customization:** Modify, add, or delete items within any section (Action Items, Decisions, Risks, Open Questions, Topics, References, Technical Concepts, and custom Additional Notes) before or after saving.
* **Auto-Saving organizational Memory:** Generated notes are saved automatically to your dashboard and are fully searchable.
* **Stripe Test Billing Portal:** A functional subscription flow with Starter (Free), Pro, and Team plan tiers with gated usage limits (3, 100, and 1,000 summaries/day respectively) and real-time backend webhook state management.
* **High-Fidelity PDF Export:** Generate and download clean, styled meeting report PDFs instantly.
* **Comprehensive Docs & Support:** Built-in FAQ guide, system operational status indicators, and customer support ticket submission forms.

---

## 🛠️ Technology Stack

### Backend
* **FastAPI:** High-performance web framework.
* **SQLite:** Reliable local relational database with custom thread-safe connection pooling.
* **Groq API:** Blazing-fast inference using the **Llama 3.3 70B** model.
* **Bcrypt:** Password hashing.
* **Stripe SDK:** Subscription management and secure webhook verification.

### Frontend
* **React (Vite):** Fast single-page application build setup.
* **Tailwind CSS:** Modern, responsive styling.
* **Lucide React:** Icon library.
* **jsPDF:** Client-side PDF generation.

---

## 📁 Repository Structure

```text
one day Assesment/
├── backend/            # FastAPI python server code
│   ├── main.py         # Main entry point, routes, database init, Stripe webhooks
│   ├── requirements.txt# Backend dependencies
│   ├── Procfile        # Railway deployment configuration
│   └── .env.example    # Template for local environment configuration
├── frontend/           # React frontend single-page app
│   ├── src/            # Components, pages, assets, router hooks
│   │   ├── App.jsx     # Main React routes, AuthContext, Page views
│   │   └── index.css   # Tailored theme css styles
│   ├── vercel.json     # SPA routing rewrite rules for Vercel hosting
│   └── package.json    # Frontend dependencies
├── .gitignore          # Repository git-ignore configuration (ignores secrets/databases)
└── README.md           # Project documentation
```

---

## 💻 Local Development Setup

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment template and add your credentials:
   ```bash
   cp .env.example .env
   ```
5. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.

---

## 🌐 Production Deployment

### Backend (Railway)
* Set **Root Directory** to `backend`.
* Add environment variables (`GROQ_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_TEAM_PRICE_ID`, `FRONTEND_URL`).
* Deploy and generate your public backend URL.

### Frontend (Vercel)
* Set **Root Directory** to `frontend`.
* Add environment variable `VITE_API_BASE` pointing to your Railway backend URL (make sure it starts with `https://` and has no trailing `/`).
* Deploy.

### Stripe Webhook Configuration
* Go to Stripe Dashboard -> Webhooks -> Add Endpoint.
* Set URL to: `https://your-railway-domain.up.railway.app/api/stripe/webhook`
* Select events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, and `customer.subscription.deleted`.
* Copy the signing secret (`whsec_...`) and add it to your Railway config variables as `STRIPE_WEBHOOK_SECRET`.
