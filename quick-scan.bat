@echo off
chcp 65001 >nul
echo ================================================
echo  🔍 Quick Scan - สแกนหุ้นด่วน
echo ================================================
echo.
echo  สแกนหุ้นที่ตั้งค่าไว้แบบเร็ว (ไม่เทรดอัตโนมัติ)
echo.
pause

echo.
echo 🔍 กำลังสแกน...
call npx ts-node -e "require('./src/lib/bot/scanner').quickScan().then(r => console.log(JSON.stringify(r, null, 2)))"

echo.
echo ✅ สแกนเสร็จแล้ว!
pause
