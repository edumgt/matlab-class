uvicorn server.app:app --reload --host 0.0.0.0 --port 8000

GET  http://localhost:8000/api/health
POST http://localhost:8000/api/auth/login    { username, password }
POST http://localhost:8000/api/auth/refresh  { refresh_token }
POST http://localhost:8000/api/auth/logout   { refresh_token }
GET  http://localhost:8000/api/auth/me       (Bearer token)
GET  http://localhost:8000/api/stocks        (Bearer token)
