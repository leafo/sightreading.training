
.PHONY: new_migration migrate init_schema test_db lint lint_js checkpoint restore_checkpoint annotate_models

new_migration:
	(echo "  [$$(date +%s)]: =>"; echo) >> migrations.moon

migrate:
	lapis migrate
	make schema.sql

schema.sql::
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

lint_js:
	node_modules/.bin/eslint $$(git ls-files static/js/ | grep '\.js[x]$$')

checkpoint:
	mkdir -p dev_backup
	pg_dump -F c -U postgres sightreading > dev_backup/$$(date +%F_%H-%M-%S).dump

restore_checkpoint:
	-dropdb -U postgres sightreading
	createdb -U postgres sightreading
	pg_restore -U postgres -d sightreading $$(find dev_backup | grep \.dump | sort -V | tail -n 1)

annotate_models:
	lapis annotate $$(find models -type f | grep moon$$)
