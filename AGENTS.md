## Overview
This repository hosts the webtrees pedigree chart module — an interactive SVG pedigree (rectangular tree) chart of an individual's ancestors using D3.js, installed as a Composer package inside webtrees.

## Setup/env
- PHP 8.3+ with extensions dom and json is required; composer installs dependencies into .build/vendor and binaries into .build/bin.
- Node.js tooling is used for asset builds (rollup). Install dev dependencies via `npm install` when touching frontend resources.
- All PHP/Node tooling runs inside the webtrees Docker buildbox — never directly on the NAS or in phpfpm:
  ```
  cd /volume2/docker/webtrees && make bash
  cd app/vendor/magicsunday/webtrees-pedigree-chart
  ```
- JS bundles are built via the node Docker container from the module directory: `make install`, `make build`.
- After PHP or JS changes visible in the browser: `docker restart webtrees-phpfpm-1`.
- After JS changes, always verify in the browser via Playwright before claiming success.

### Convention for new advisory ignores

Before adding an entry, check the following. Is the package a direct dependency (`composer why`)? Does a public fix exist? Does an exact pin of webtrees alone block that fix (`composer why-not <package> <fixed version>`)? Update instead of ignoring whenever the fix is reachable.

- An advisory that webtrees' exact pin keeps unresolved is ignored by its **advisory ID** under `config.policy.advisories.ignore-id`, so later advisories on the same package keep blocking. Never ignore by package name under `ignore`, because that also hides every later advisory of the package.
- The reason starts with a prefix that says why the entry exists, followed by the CVE and the condition for removing it. `UPSTREAM-PINNED:` marks a fix that exists publicly but is held back by the exact pin of webtrees. `ACCEPTED:` is reserved for a conscious risk acceptance with a low severity and no attack path in this package.
- Remove the entry once the supported webtrees range no longer pins an affected version.

## Build & tests
- **`composer ci:test` MUST run before every commit** — catches Biome, PHPStan, PHP-CS-Fixer, Rector, PHPUnit, Jest, and CPD issues before they reach GitHub CI.
- Individual checks: `composer ci:test:php:phpstan`, `composer ci:test:php:unit`, `composer ci:test:php:cgl`, `composer ci:test:js:lint`, `composer ci:test:js:unit`.
- `composer ci:test:php:cpd` runs the installed `node_modules/.bin/jscpd`, so the Node dependencies must be installed (`make install` or `npm ci`). jscpd is pinned to an exact version in `package.json`. CI runs it as its own job through the shared `cpd.yml` workflow of the `.github` repository, reported as `cpd / Copy-paste detection`.
- `composer ci:test:php:infection` runs mutation testing against `src/` with a gating score floor in `infection.json5`. It is not part of `composer ci:test`, because a mutation run is too slow for every local check. CI runs it as the mutation step of the shared `php-quality.yml` workflow, on one PHP leg of its matrix. The floor sits a little below the measured score, so raise it as the score improves and never lower it to admit a regression.
- Single PHPUnit test: `composer ci:test:php:unit -- --filter TestClassName`.
- Auto-fix: `composer ci:cgl` (PHP style), `composer ci:rector` (Rector), `npm run lint:fix` (Biome).
- JS bundles: `make build` (rollup), `make watch` (dev rebuild loop).
- Translations: `make lang` runs the i18n pipeline and compiles every `.po` to its `.mo`. A text of this module is translated in the locales that ship a translation for it. A text that webtrees already translates stays empty, see the catalogue rules below.
- **Catalogue rules.** webtrees merges the compiled catalogue of a module over its own, so an entry here replaces the webtrees translation of the same text in the whole installation, not only on this module's pages.
    - Leave the `msgstr` empty for a text that every webtrees release the module supports translates in that locale, unless the module deliberately words it differently. These entries stay filled on purpose: the chart title (`Pedigree chart`), because the module replaces the core pedigree chart and names it in its own words, the button and form labels that the module words for its own context and that differ from the core translation (empty one of them to adopt the core wording), and the entries that the oldest supported release translates differently or not at all, which stay filled until the supported range moves up. The compiled MO omits an empty entry, so the core wording is used. A filled copy shadows the core text and goes stale when core rewords it. Nothing checks this automatically, because the comparison needs the core catalogue of every supported tag. Compare against the `.po` files of a git checkout of each supported webtrees tag. A text that core added later is not core-owned for the older releases, and the module must keep its own translation until the supported range moves up.
    - A plural entry is either left empty entirely or has every form filled in, and the number of forms (the `msgstr[N]` slots of an empty entry included) is the number the webtrees plural rule of the locale selects from (`Locale::create($tag)->pluralRule()->plurals()` in `fisharebest/localization`). webtrees ignores the `Plural-Forms` header of the PO, so the header only has to agree with that rule. `tests/CatalogueStructureTest.php` extends the shared catalogue structure case of `webtrees-module-base` and names the catalogue directory. The shared case enforces the form count, the empty forms and the placeholders of the compiled catalogue, the slot count of the source catalogue and the form count in its header, and renders every plural entry for a range of numbers.
- **Every class under `src/` is final**, and a phpat rule in `tests/Architecture/ArchitectureTest.php` enforces it (the rule does not cover traits). A class that a test needs to stub is not made final. It is excluded from the rule with a reason.
- **PHPStan runs the shared strict tier** (`phpstan.neon` includes `phpstan/strict.neon` of `magicsunday/coding-standard`, which needs `shipmonk/phpstan-rules`, `symplify/phpstan-rules` and `spaze/phpstan-disallowed-calls` as devDependencies). Fix a finding in code. An irreducible idiom conflict gets an `ignoreErrors` entry scoped by identifier and path with a comment, never a baseline.
- Keep PHPStan, PHPCS, and CPD clean on affected code; add PHPUnit attribute-based coverage (positive and negative cases) for every class/method introduced or modified.
- If `node_modules` has permission issues (from node container), clean via: `docker compose run --rm buildbox-root bash -c "rm -rf app/vendor/magicsunday/webtrees-pedigree-chart/node_modules"`.
- **Shared JS/TS configs**: `biome.json` extends `@magicsunday/coding-standard/biome/base.json` and `tsconfig.json` extends `@magicsunday/coding-standard/tsconfig/base` (devDependency `github:magicsunday/coding-standard#<tag>`, an exact tag pin). The house Biome rules and the strict compiler flags (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, …) live there — keep only module-specific settings (file scope, paths, lib) locally and never switch a pinned strict flag back off. `@biomejs/biome` and `typescript` stay this module's own devDependencies within the package's `peerDependencies` ranges. `composer ci:test:php:templates` asserts both extends links.
- **Typecheck scope is intentionally limited to production sources** (`tsconfig.json` includes only `resources/js/modules/**/*.js`). Tests under `resources/js/tests/**` are validated by jest at runtime but skipped by `tsc --noEmit` because the partial mock objects required to isolate units would otherwise produce dozens of structural-incompatibility errors against the real `Configuration` / `Selection` shapes. The strict-typecheck gate applies to shipped code; test scaffolding stays loose.

## Architecture

### Data flow: PHP → JSON → D3

```
Module.php (entry point, registers routes)
  → page.phtml (form + AJAX container, localStorage via Storage)
    → chart.phtml (import() loads ES module, passes config as JS object)
      → DataFacade.php (builds Node tree from Individual records)
        → DateProcessor, NameProcessor, ImageProcessor (from module-base)
          → NodeData → JSON → D3 hierarchy → SVG rendering
```

### PHP (`src/`)
- **Module.php** — Entry point, extends webtrees PedigreeChartModule, registers chart route.
- **Configuration.php** — Reads form parameters from request (POST/GET) with user preference fallback.
- **Facade/DataFacade.php** — Builds hierarchical Node tree from an Individual and recurses to the configured generation depth.
- **Model/Node** — Tree node with JSON serialization for D3. It wraps the `NodeData` of module-base (`MagicSunday\Webtrees\ModuleBase\Model\NodeData`), which the module does not copy. `NodeData` carries the name as `nameSegments`, the ordered `NameSegment` list of module-base (`label`, `kind`, `isPreferred`), next to the flat `name`. `DataFacadeTest` pins the key order of the serialised payload.
- **Shared classes from [`magicsunday/webtrees-module-base`](https://github.com/magicsunday/webtrees-module-base)** (composer dependency, the constraint is in `composer.json`):
  - `Processor/DateProcessor`: date extraction. Pedigree still uses the legacy locale-aware methods (`getBirthDate`, `getDeathDate`, `getLifetimeDescription`) for the single date line of a box.
  - `Processor/FactResolver`: the fact slots of a person (birth, death, then the optional tags of the tree preference `CHART_BOX_TAGS`, where a marriage or divorce tag gives one entry per family with the name of the spouse in `partner`). `DataFacade` builds it privately with the full place name and puts the slots into the person payload only while `Configuration::getShowDetailPanel()` is on, so a chart without the detail panel pays neither their payload nor their database work.
  - `Processor/NameProcessor`, `Processor/ImageProcessor`, `Processor/PlaceProcessor` — name/image/place extraction. `DataFacade` fills the name segments from `NameProcessor::getNameSegments()`.
  - `Model/Symbols` — backed enum for genealogical symbols (Birth ★, Death †, MarriageDateUnknown sentinel).
  - `Module/VersionInformation` — GitHub release-checking with file cache.
  - For local edits to module-base while developing pedigree-chart, run `make link-base` (symlinks `.build/vendor/.../webtrees-module-base` → the sibling clone). Reverse with `make unlink-base` or any `composer install/update`.

### JS (`resources/js/modules/`)
Flat layout. Every file is pedigree-specific glue. Reusable base classes (Storage, ChartExport, ChartOverlay, ChartZoom, Orientations, measureText, truncateNames) and the linked-tree render layer (`LinkedTreeSvg`, `OrientationCollection`, `ImageBox`, `TextBox`, `TextRenderer`, `DateRenderer`, the `LAYOUT_*` constants, imported from the `@magicsunday/webtrees-chart-lib/linked-tree` subpath) live in the external [`@magicsunday/webtrees-chart-lib`](https://github.com/magicsunday/webtrees-chart-lib) package, shared with the fan- and descendants-chart modules. Consumed via Git URL pinned in `package.json` (`github:magicsunday/webtrees-chart-lib#X.Y.Z`); chart-lib's `prepare` script builds its `dist/` during install, so `npm ci --ignore-scripts` will break the build.
- **`index.js`** — Exports `PedigreeChart` class (ES module entry point for Rollup).
- **`page-entry.js` / `page-init.js`** — UMD bundle (`pedigree-chart-page.min.js`) loaded by `page.phtml`. Owns localStorage form-state wiring; `initPage()` resolves user options and publishes them under `WebtreesPedigreeChart.chartOptions` for `chart.phtml` getters.
- **`chart.js`** (D3 hierarchy.tree layout, click handling and selection), **`hierarchy.js`** (D3 hierarchy, enlarges the boxes for the alternative name), **`tree.js`** (draws the nodes and links), **`configuration.js`**.
- **`detail-panel.js`**: the panel with the facts of the selected person. One element (`aside` in `page.phtml`, hidden unless the switch is on), a Bootstrap offcanvas without a backdrop that opens on a selection and closes on a click beside it (not on a person, and not after a drag) and on Escape, with a shadow in `pedigree-chart.css`. Person text is written with `textContent` only. The panel orders the facts itself: the birth first, the death last and the facts between them by the `sortDay` of the fact payload, where a fact without a usable day keeps its place. The image above the facts (`data-panel="image"`) shows the `thumbnail` of the person payload and swaps to its `silhouette` once when the thumbnail cannot be loaded, a person without a `thumbnail` shows no image, as in the box. When the panel has closed, `chart.js` clears the selected mark, after the focus went back to the person. With the switch `showDetailPanel` on, `chart.js` makes a click or Enter select the person instead of navigating, and the buttons of the panel open the individual page or centre the chart. The person boxes are focusable only in that mode.
- **`tree/`** — `name.js` (extends the `TextRenderer` of the chart-lib linked-tree layer and draws the `nameSegments` as runs, a given-name block and a surname block, without searching the full name), `node-drawer.js`, `link-drawer.js`, `family-color.js`.
- **`constants.js`** (the sex constants), **`d3.js`** (re-export facade).

### Views (`resources/views/`)
- **`pedigree-chart/page.phtml`** — Form + AJAX container. Loads `pedigree-chart-page.min.js` and calls `WebtreesPedigreeChart.initPage({ ajaxUrl })`.
- **`pedigree-chart/chart.phtml`** — AJAX response: `<script type="module">` with `import()` to load ES module bundle. Reads user overrides from `WebtreesPedigreeChart.chartOptions ?? PHP defaults`.
- **`pedigree-chart/form/{generations,layout,orientation}.phtml`** — Form partials.
- **`charts/chart.phtml`** — Block template override (home page widget), uses `data-wt-ajax-url` pattern.

## Key patterns
- **ES module loading**: `import().then(({ PedigreeChart }) => ...)` in `<script type="module">`, avoiding the `webtrees.load()` race condition.
- **Storage flow**: `page-init.js` reads localStorage → publishes resolved options under `WebtreesPedigreeChart.chartOptions` → `chart.phtml` getter reads `opts.x ?? PHP default`.
- **Orientation strategy**: chart layout is configurable in 4 directions (top-bottom, bottom-top, left-right, right-left). The `OrientationCollection` of the chart-lib linked-tree layer picks the matching `Orientation*` class which provides node coordinate transforms and elbow connector geometry.
- **Block template**: Overrides core `modules/charts/chart.phtml` — must stay in sync with webtrees core changes (e.g. VanillaJS conversion).

## Release process
Runs inside the buildbox (requires git, node, npm, composer, jq, zip, gh, sed):
```
make release 2.1.0
make release 2.1.0 NOTES_FILE=/tmp/notes.md
make release VERSION=2.1.0 NOTES="Bug fix release"
```
Pipeline (`make release X.Y.Z`):
- `release-check` — tools, semver, clean tree, no detached HEAD, no active `make link-base` symlink, gh auth (or `GH_TOKEN`).
- `release-prepare` — `sed_edit` macro updates `CUSTOM_VERSION` in `src/Module.php` with a post-write assertion; `jq_edit` macro (with `--indent 4` and post-write assertion) updates `package.json` version + `composer.json` webtrees pin → clean+rebuild JS bundles via `build-js-fresh` → commit → `dist` → tag (only after dist succeeds, so a dist failure does not leave a dangling tag).
- `dist` — symlink guard fires before composer touches anything, `composer install --no-dev --no-interaction`, `git archive HEAD` (respects `.gitattributes` export-ignore), bundles `magicsunday/webtrees-module-base` into the zip's `vendor/` so manual ZIP installs work without composer, strips all `composer.json` files (`find vendor -name composer.json -delete`), atomic write via `.tmp` + rename + `zip -T` integrity check.
- `dist-smoke` — separate target, asserts required entries (module.php, LICENSE, the versioned JS bundle, module-base `src/`) are present and forbidden ones (composer.json, assets/) are absent. CI runs this on every push.
- `release-publish` — `git push --tags`, `gh release create` with the zip + notes, emits `RELEASE_PUBLISHED version=X` marker for agent observers.
- `release-bump` — bump to `VERSION+1-dev`, keep the `~2.2.0` (stable) webtrees constraint, push. The dev tree tracks stable webtrees, not `dev-main`, because the `dev-main` i18n refactor removed APIs the module still uses and stable is what end users install; re-add `|| dev-main` here (and adapt the code) when webtrees' next stable nears.

## Code style

### PHP
- Follow PSR-12 with `declare(strict_types=1)` in every file.
- **No `mixed` types** — use specific types or union types.
- **No `empty()`** — use explicit comparisons (`=== ''`, `=== []`, `=== null`).
- Use enums or typed constants instead of magic numbers/strings.
- Prefer value objects over complex plain arrays.
- Provide explicit parentheses for complex conditional expressions.
- Use expressive variable names; English inline comments only at complex logic.
- Docblocks: Always multi-line format. Describe purpose, not just repeat the method name. Keep `@param` only when it adds information beyond type+name. Keep `@return` tags.

### JavaScript
- ES modules only; vanilla JS except D3.
- **`@private`** on all non-public methods — this is the JS equivalent of PHP `private`.
- **`@return`** on all getters and methods that return a value.
- **No single-line docblocks** — always use multi-line `/**\n * text\n */` format.
- Use `@return` (not `@returns`) for consistency.
- Docblock order: description → `@param` → `@return` → `@private`.
- Parenthesize arithmetic in comparisons: `if (si < (group.length - 1))`.
- Parenthesize sub-conditions in compound booleans: `if ((a > 0) && (b < 1))`.
- No single-letter variable names except loop iterators.
- `for...of` on arrays (not `for...in`).
- `Object.prototype.hasOwnProperty.call()` instead of direct `.hasOwnProperty()` for prototype-pollution safety.
- Always include `.js` extension on relative ES module imports (Biome `useImportExtensions`).

## Security
- Do not commit secrets or PII; rely on secret managers and keep .build outputs out of version control.

## PR/commit checklist
- `composer ci:test` must pass before every commit.
- Commit subjects — and the pull-request title — are governed by the shared `commit-convention` gate; the normative rule and its full rationale live in `magicsunday/.github/.github/workflows/commit-convention.yml@main`, which self-tests a decision table before applying it. In short: a `GH-`-prefixed subject must match `^GH-\d+: [A-Z]`, every other subject `^[A-Z]` — a capitalised English imperative — and conventional-commit prefixes (`feat:`, `Fix:`, …) as well as path-like starts (`src/…: …`) are rejected whatever their case. It runs on every pull request via `.github/workflows/commit-lint.yml`, advisory until `commit-convention / Commit convention` is a required context in branch protection.
- Branches for an issue are named exactly `GH-<N>`; the `GH-<N>: ` prefix marks work that belongs to that issue, so a drive-by fix on the branch keeps its own unprefixed subject.
- The pull-request body closes the issue with `Closes #<N>` — the `GH-<N>: ` subject prefix is not a GitHub link and closes nothing.
- Never add a `Co-Authored-By:` trailer or any other AI attribution.
- Keep PRs small and focused (~≤300 net LOC) with atomic commits.
- Ensure coverage ≥90% on touched PHP paths.
- After PR receives review comments: assess, fix, commit, reply with commit hash, resolve threads via GraphQL.
- Never comment on GitHub issues/PRs without explicit user approval.

## When stuck
- Check composer scripts (`composer run-script --list`) and the README for expected workflows.
- The fan-chart module follows the same architectural patterns and is the canonical reference for tooling/CI/test setup.

## House Rules
- Maintain strict typing and PHPStan level max alignment.
- Prefer interfaces where sensible; mark data-only classes as `readonly`.
- Avoid external JavaScript libraries beyond D3.
- Always use Playwright to verify JS changes in the browser — don't just trust the tests.
- Use `jq` (not `sed`) for **JSON file** manipulation in build scripts — Alpine `sed` does not support the GNU regex extensions needed for nested JSON edits. `sed` is fine for non-JSON files (PHP, YAML); see the `sed_edit` and `jq_edit` macros in `Make/release.mk`.
