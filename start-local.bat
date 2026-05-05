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

REM Alpaca API credentials (Paper Trading)
set ALPACA_API_KEY=PKYT6BWD7TJOGECYU4BPWJJAR5
set ALPACA_SECRET_KEY=5pjf2rLNNPKYJwmjoLN2rbmjMM6MyuG6ty2toEaJppjA
set ALPACA_PAPER=true
set USE_ALPACA_PRICES=true
set USE_ALPACA_TRADING=true

echo Installing dependencies (if missing)...
call npm install

echo.
echo Starting server...
npm run dev

echo.
echo Server stopped. Press any key to exit.
pause
