@echo off
echo ========================================
echo  Restarting Manga Website Server
echo ========================================
echo.

echo [1/3] Killing all node processes...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo    ^> Node processes killed
) else (
    echo    ^> No node processes running
)

echo.
echo [2/3] Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo.
echo [3/3] Starting server...
echo.
echo ========================================
echo  Server Starting...
echo ========================================
echo.

npm start
