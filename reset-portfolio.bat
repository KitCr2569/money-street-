@echo off
chcp 65001 >nul
echo ================================================
echo  💰 Reset Paper Trading Portfolio
echo ================================================
echo.
echo  ล้างข้อมูลพอร์ตและเริ่มต้นใหม่?
echo  (เงินจะกลับเป็น $100,000 เดิม)
echo.
pause

echo.
echo 🗑️ กำลังล้างข้อมูล...
call npx ts-node -e "require('./src/lib/bot/paper-trader').resetPortfolio(100000)"

echo.
echo ✅ Reset เสร็จแล้ว!
pause
