# Disposable CI runner only; this is not a deployed web service.
FROM openresty/openresty:bookworm-fat@sha256:1ce8f26c0b4339b4a2ddc616cb64a4b4f6df7195de4ce732c1f31cce64195aab
RUN --mount=type=secret,id=build_ca_bundle,mode=0444 set -e; if [ -f /run/secrets/build_ca_bundle ]; then printf 'Acquire::https::CaInfo "/run/secrets/build_ca_bundle";\n' > /etc/apt/apt.conf.d/99-build-ca; fi; rm -f /etc/apt/sources.list.d/openresty.list && find /etc/apt -type f \( -name '*.list' -o -name '*.sources' \) -exec sed -i 's@http://deb.debian.org@https://deb.debian.org@g' {} + && apt-get update --error-on=any && apt-get install -y --no-install-recommends postgresql libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/* && rm -f /etc/apt/apt.conf.d/99-build-ca
RUN --mount=type=secret,id=build_ca_bundle,mode=0444 set -e; if [ -f /run/secrets/build_ca_bundle ]; then export SSL_CERT_FILE=/run/secrets/build_ca_bundle CURL_CA_BUNDLE=/run/secrets/build_ca_bundle; fi; luarocks config check_certificates true && luarocks install lua-resty-http 0.17.2-0 && luarocks install lapis 1.20.0-1 && luarocks install moonscript 0.7.0-1 && luarocks install bcrypt 2.3-1 && luarocks install tableshape 2.6.0-1 && luarocks install busted 2.2.0-1
WORKDIR /site/sightreading.training
COPY . .
# Checkout permissions vary between local and hosted CI. Nginx's worker must read
# the compiled app, assets and config in this disposable test container.
RUN printf 'disposable sightreading CI image\n' > /usr/local/share/sightreading-disposable-ci && find . -name '*.moon' -exec moonc {} + && chmod -R a+rX /site
ENTRYPOINT ["bash", "./ci.sh"]
