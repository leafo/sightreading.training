FROM leafo/lapis-archlinux:latest
MAINTAINER leaf corcoran <leafot@gmail.com>

RUN pacman -Sy npm sassc --noconfirm && \
	yes | pacman -Scc && \
	npm install -g coffee-script && \
	npm install -g uglify-js

WORKDIR /site/sightreading.training
ADD . .
ENTRYPOINT ./ci.sh
