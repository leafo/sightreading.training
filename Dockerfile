FROM leafo/lapis-archlinux-itchio:latest
MAINTAINER leaf corcoran <leafot@gmail.com>

WORKDIR /site/sightreading.training
ADD . .
ENTRYPOINT ./ci.sh
