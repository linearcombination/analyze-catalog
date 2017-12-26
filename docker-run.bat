docker build . -t analyze-catalog
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%
docker run ^
    --rm ^
    --volume %TEMP%:/working ^
    analyze-catalog
