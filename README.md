# Dairy Management App

Admin app for milk delivery records and billing.

## Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Python FastAPI + MongoDB
- **Database:** MongoDB (separate entry per delivery line, grouped on UI)

## Prerequisites

- Python 3.10+
- Node.js 18+ (via nvm)
- MongoDB running locally (or MongoDB Atlas URL in `.env`)

## Setup

### 1. MongoDB

Start MongoDB locally:

```bash
sudo systemctl start mongod
```

Or use MongoDB Atlas and set `MONGODB_URL` in `backend/.env`.

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://127.0.0.1:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

## Features

- **Customers (ગ્રાહકો):** Add customers with opening balance
- **Delivery (ડિલિવરી):** Morning/Evening grid — Batli, Cow, Potla (M/G/B)
- **Paid / Not Paid (જમા / બાકી):** Mark payment at delivery time
- **Bills (બિલ):** Must-card style bill → share as PNG image
- **Reports (રિપોર્ટ):** Daily & monthly tables for **all customers** with date filter, search, pagination
- **Bilingual UI:** English (ગુજરાતી) on all labels

## Default Milk Rates

| Source | Type | Rate |
|--------|------|------|
| Batli  | M    | ₹35  |
| Cow    | G    | ₹30  |
| Potla  | M    | ₹42  |
| Potla  | G    | ₹42  |
| Potla  | B    | ₹48  |

Rates are seeded on first run in MongoDB `rates` collection.

## Project Structure

```
backend/
  app/
    main.py
    routes/
    models/
frontend/
  src/
    pages/
    components/
    api/
```
