FROM leafo/lapis-archlinux:latest
MAINTAINER leaf corcoran <leafot@gmail.com>

RUN pacman -Sy npm sassc --noconfirm && \
	yes | pacman -Scc

WORKDIR /site/sightreading.training
ADD . .
ENTRYPOINT ./ci.sh
