# =============================================================================
# TARGETS
# =============================================================================

#### Linting

.PHONY: lint lint-fix

lint: .logo ## Run Biome on JavaScript sources.
	@$(COMPOSE_RUN) npm run lint
	@echo -e "${FGREEN} ✔${FRESET} Biome passed"

lint-fix: .logo ## Run Biome with auto-fix on JavaScript sources.
	@$(COMPOSE_RUN) npm run lint:fix
	@echo -e "${FGREEN} ✔${FRESET} Biome auto-fix applied"

#### Testing

.PHONY: test

test: .logo ## Run the JavaScript unit tests.
	@$(COMPOSE_RUN) npm test
