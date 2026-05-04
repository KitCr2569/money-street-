@echo off
echo ================================================
echo  Money Street - Trading Bot (Local Mode)
echo ================================================
echo.
echo  Starting system in Local Mode...
echo  Using SQLite database (no Turso needed)
echo.
echo  Open browser at: http://localhost:3000/bot
echo.
pause

echo.
REM Set environment variables for local mode
set USE_LOCAL_DB=true
set NEXTAUTH_SECRET=your-secret-key-here
set NEXTAUTH_URL=http://localhost:3000

echo Installing dependencies (if missing)...
call npm install

echo.
echo Starting server...
npm run dev

echo.
echo Server stopped. Press any key to exit.
pause
