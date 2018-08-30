set -e
docker build . -t analyze-catalog
docker run \
    --rm \
    --volume /tmp:/working \
    analyze-catalog
