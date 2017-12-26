docker build . -t analyze-catalog
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%
docker run ^
    -it ^
    --rm ^
    --volume %TEMP%:/working ^
    --entrypoint=/bin/bash ^
    analyze-catalog
