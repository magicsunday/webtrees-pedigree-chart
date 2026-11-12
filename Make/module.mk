# =============================================================================
# Module parameters
#
# The only file of the Make setup and of tests/Release/ that holds values of this
# module. Every other file there is copied from the template of
# magicsunday/coding-standard by its sync script and is the same in every module.
# The Makefile reads this file before every other fragment, and the release tests
# read it at run time.
# =============================================================================

# The package name of composer.json without the vendor.
MODULE_NAME := webtrees-pedigree-chart

# The segment of the PHP namespace between MagicSunday\Webtrees\ and the Test\ or src/ part.
MODULE_NS := PedigreeChart

# The prefix injected into the bundled module-base classes at dist time.
SCOPE_NS := PedigreeChartVendor

# The webtrees constraint that release-prepare and release-bump write to composer.json.
WEBTREES_CONSTRAINT := ~2.2.0

# The file of the chart library build that marks a finished build.
CHART_LIB_MARKER := webtrees-chart-lib-infra.es.js

# The shared module-base views that the archive bundles, by file name without the extension.
SHARED_VIEWS := detail-panel help-popover toolbar-style
