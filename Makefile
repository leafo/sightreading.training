
.PHONY: deploy_targets deploy new_migration migrate init_schema test_db lint checkpoint restore_checkpoint annotate_models

deploy_targets:
	@find -L . -type f | grep -v node_modules | grep -P '\.(js|css|html|svg)$$'

deploy:
	rsync -RvuzL $$(make -s deploy_targets) leaf@leafo.net:www/sight-reading/

new_migration:
	(echo "  [$$(date +%s)]: =>"; echo) >> migrations.moon

migrate:
	lapis migrate
	make schema.sql

schema.sql:
	pg_dump -s -U postgres sightreading > schema.sql
	pg_dump -a -t lapis_migrations -U postgres sightreading >> schema.sql

init_schema:
	createdb -U postgres sightreading
	cat schema.sql | psql -U postgres sightreading

test_db:
	-dropdb -U postgres sightreading_test
	createdb -U postgres sightreading_test
	pg_dump -s -U postgres sightreading | psql -U postgres sightreading_test
	pg_dump -a -t lapis_migrations -U postgres sightreading | psql -U postgres sightreading_test


lint:
	git ls-files | grep '\.moon$$' | grep -v config.moon | xargs -n 100 moonc -l

checkpoint:
	mkdir -p dev_backup
	pg_dump -F c -U postgres sightreading > dev_backup/$$(date +%F_%H-%M-%S).dump

restore_checkpoint:
	-dropdb -U postgres sightreading
	createdb -U postgres sightreading
	pg_restore -U postgres -d sightreading $$(find dev_backup | grep \.dump | sort -V | tail -n 1)

annotate_models:
	lapis annotate $$(find models -type f | grep moon$$)
