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
set ALPACA_API_KEY=PKAVKSFH2FZWVYZVRXGXT5JUDD
set "ALPACA_SECRET_KEY=HDdKt8qFCuJ4o7PB9ccSzPu4cXJpCmEWze2e9kNonPLk"
set ALPACA_PAPER=true
set USE_ALPACA_PRICES=true
set USE_ALPACA_TRADING=true

echo Installing dependencies (if missing)...
call npm install

echo.
echo [Debug] API Key length should be 26
echo [Debug] Secret Key length should be 50
echo.
echo Starting server...
npm run dev

echo.
echo Server stopped. Press any key to exit.
pause
