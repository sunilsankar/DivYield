# DivYield Development

## Requirements

- Node.js LTS
- npm
- Python 3.12+
- Git

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Tests

Backend:

```bash
cd backend
pytest
```

Frontend:

```bash
npm run test
```

E2E:

```bash
npm run test:e2e
```
