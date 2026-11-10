@echo off
chcp 65001 >nul
title PhotoAutoCrop Pro
echo 正在啟動 PhotoAutoCrop Pro 本機照片裁切工作台...
start "" "http://127.0.0.1:3300"
node server.js
pause