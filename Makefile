
.PHONY: deploy_targets deploy

deploy_targets:
	@find -L . -type f | grep -v node_modules | grep -P '\.(js|css|html|svg)$$'

deploy:
	rsync -RvuzL $$(make -s deploy_targets) leaf@leafo.net:www/sight-reading/

