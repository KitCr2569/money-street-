@echo off
chcp 65001 >nul
echo ================================================
echo  🤖 Money Street - Trading Bot (Local Mode)
echo ================================================
echo.
echo  กำลังเริ่มระบบในโหมด Local...
echo  ใช้ SQLite database บนเครื่อง (ไม่ต้องต่อ Turso)
echo.
echo  เปิดเบราว์เซอร์ที่: http://localhost:3000/bot
pause
echo.

REM Set environment variables for local mode
set USE_LOCAL_DB=true
set NEXTAUTH_SECRET=your-secret-key-here
set NEXTAUTH_URL=http://localhost:3000

echo 📦 กำลังติดตั้ง dependencies (ถ้าขาด)...
call npm install

echo.
echo 🚀 กำลังเริ่มเซิร์ฟเวอร์...
npm run dev

echo.
echo ⚠️ ถ้าเซิร์ฟเวอร์ปิด กดปุ่มใดๆ เพื่อออก
pause
