set -e
if [ -z "${AC_WORKING_DIR}" ]; then
    echo "ERROR: Please set AC_WORKING_DIR to the directory to use for output."
    exit 1
fi
docker build . -t analyze-catalog
docker run \
    --rm \
    --volume ${AC_WORKING_DIR}:/working \
    analyze-catalog
