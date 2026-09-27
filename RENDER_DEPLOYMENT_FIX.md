# Render Deployment Fix Guide

## Problem
The error `ModuleNotFoundError: No module named 'asyncpg.protocol.protocol'` occurs because **asyncpg doesn't support Python 3.13** yet.

## Solution
We need to force Render to use Python 3.11 instead of Python 3.13.

## Files Created/Updated

### 1. `.python-version` (Created)
```
3.11.9
```
This file tells Render to use Python 3.11.9

### 2. `runtime.txt` (Created)
```
python-3.11.9
```
Alternative way to specify Python version for deployment platforms

### 3. `pyproject.toml` (Updated)
Changed Python version constraint from:
```toml
python = "^3.10"
```
To:
```toml
python = ">=3.10,<3.13"
```
This explicitly excludes Python 3.13

### 4. `render.yaml` (Created)
Render configuration file that specifies:
- Python version: 3.11.9
- Build command: Install poetry and dependencies
- Start command: Run uvicorn server
- Environment variables including DATABASE_URL

### 5. `requirements.txt` (Generated)
Exported from poetry for platforms that prefer requirements.txt over poetry

## Deployment Steps for Render

### Option 1: Using Render Dashboard

1. **Go to your Render dashboard**
2. **Select your service** (car-parking-backend or similar)
3. **Go to Settings**
4. **Update Environment Variables:**
   - Add `PYTHON_VERSION` = `3.11.9`
5. **Update Build Command:**
   ```bash
   pip install poetry && poetry install --no-dev
   ```
6. **Update Start Command:**
   ```bash
   poetry run uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
7. **Commit and push** all the new files to your GitHub repository
8. **Trigger Manual Deploy** from Render dashboard

### Option 2: Using render.yaml (Recommended)

1. **Commit all the new files:**
   ```bash
   cd /home/ajay/Documents/personal/Projects/CarParkingSystem
   git add cps_backend/.python-version
   git add cps_backend/runtime.txt
   git add cps_backend/pyproject.toml
   git add cps_backend/poetry.lock
   git add cps_backend/requirements.txt
   git add render.yaml
   git commit -m "Fix: Force Python 3.11 to resolve asyncpg compatibility issue"
   git push origin main
   ```

2. **In Render Dashboard:**
   - Go to your service
   - Click "Manual Deploy" → "Clear build cache & deploy"
   - This ensures the new Python version is used

## Verification

After deployment, check:
1. Build logs should show: `Python 3.11.9` being installed
2. Server should start without the asyncpg error
3. Health check at `/health` should return `{"status": "healthy"}`

## Alternative Solutions (If Above Doesn't Work)

### Solution A: Use Different Database Driver
Replace asyncpg with psycopg3 (supports Python 3.13):
```bash
poetry remove asyncpg
poetry add psycopg[binary,pool]
```
Then update `app/database.py` to use psycopg instead of asyncpg

### Solution B: Downgrade to Python 3.10
Change `.python-version` to:
```
3.10.13
```

## Notes

- **Why Python 3.13 doesn't work:** asyncpg requires compiled C extensions that haven't been built for Python 3.13 yet
- **Best version:** Python 3.11.9 is stable and fully compatible with asyncpg
- **Future:** When asyncpg adds Python 3.13 support, update `pyproject.toml` to allow 3.13

## Troubleshooting

If deployment still fails:

1. **Clear Render's build cache:**
   - In Render Dashboard → Service → Manual Deploy → "Clear build cache & deploy"

2. **Check Python version in build logs:**
   ```
   Look for: "Using Python version 3.11.9"
   ```

3. **Verify asyncpg installation:**
   ```
   Should see: "Installing asyncpg (0.29.0)" in build logs
   ```

4. **Check environment variables:**
   - Ensure `DATABASE_URL` is set correctly
   - Format: `postgresql://user:password@host:port/database`

## Contact

If issues persist:
1. Check Render build logs for specific errors
2. Verify all files were committed and pushed
3. Ensure Render is pulling from the correct branch (main)
