@echo off
echo Starting JobSense Development Environment...
echo.
echo Make sure MongoDB is running separately.
echo.
cd /d "%~dp0"

echo Starting Python Embedding Service on port 8001...
start "Python Embedding Service" cmd /c "cd embedding-service && .\.venv\Scripts\activate.bat && uvicorn app:app --port 8001 --host 0.0.0.0 --app-dir . && pause"
echo Waiting for Python service...
timeout /t 7 /nobreak > nul
echo.

echo Starting Node.js Backend on port 3000...
start "Node.js Backend" cmd /c "cd node-backend && npm run dev && pause"
echo Waiting for Node.js backend...
timeout /t 7 /nobreak > nul
echo.

echo Starting Frontend Server on port 5501...
start "Frontend Server" cmd /c "cd frontend && npx serve -l 5501 && pause"
echo Waiting for Frontend server...
timeout /t 3 /nobreak > nul
echo.

echo Opening JobSense in your default browser...
start http://localhost:5501

echo.
echo JobSense services initiated.
echo - Python on http://localhost:8001
echo - Node.js on http://localhost:3000
echo - Frontend on http://localhost:5501
echo.
echo To stop services, close each of the new command prompt windows MANUALLY.
echo This main window will close after you press a key if all went well.
pause