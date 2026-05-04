@echo off
echo ================================================
echo  Reset Portfolio Database
echo ================================================
echo.
echo  This will reset your portfolio to $100,000
echo.
pause

echo.
echo Resetting portfolio...
call npx ts-node -e "require('./src/lib/bot/paper-trader').resetPortfolio(100000).then(() => console.log('Done!')).catch(e => console.error(e))"

echo.
echo Reset complete!
pause
