@echo off
title Manga Website Server
echo ========================================
echo Starting Manga Website Server
echo ========================================
echo Make sure you have Node.js installed
echo.
echo Server will be available at:
echo http://localhost:3000
echo.
echo API endpoints at:
echo http://localhost:3000/api/
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.
node api-server.js
pause