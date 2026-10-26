<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart;

use Fig\Http\Message\RequestMethodInterface;
use Fisharebest\Webtrees\I18N;
use Fisharebest\Webtrees\Module\AbstractModule;
use Fisharebest\Webtrees\Module\PedigreeChartModule;
use Fisharebest\Webtrees\Tree;
use Fisharebest\Webtrees\Validator;
use MagicSunday\Webtrees\ModuleBase\Model\NameAbbreviation;
use MagicSunday\Webtrees\ModuleBase\Model\PlaceFormatChoice;
use MagicSunday\Webtrees\ModuleBase\Model\PlaceFormatSpec;
use Psr\Http\Message\ServerRequestInterface;

use function preg_match;

/**
 * Configuration class.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
final class Configuration
{
    /**
     * Tree layout variants.
     *
     * @see PedigreeChartModule
     */
    public const string LAYOUT_TOPBOTTOM = PedigreeChartModule::STYLE_DOWN;

    public const string LAYOUT_BOTTOMTOP = PedigreeChartModule::STYLE_UP;

    public const string LAYOUT_LEFTRIGHT = PedigreeChartModule::STYLE_RIGHT;

    public const string LAYOUT_RIGHTLEFT = PedigreeChartModule::STYLE_LEFT;

    /**
     * The default number of generations to display.
     */
    public const int DEFAULT_GENERATIONS = 4;

    /**
     * Minimum number of displayable generations.
     */
    public const int MIN_GENERATIONS = 2;

    /**
     * Maximum number of displayable generations.
     */
    public const int MAX_GENERATIONS = 25;

    /**
     * Tree layout.
     */
    public const string DEFAULT_TREE_LAYOUT = self::LAYOUT_LEFTRIGHT;

    /**
     * Default base color for the paternal lineage (hex).
     */
    public const string PATERNAL_COLOR_DEFAULT = '#70a9cf';

    /**
     * Default base color for the maternal lineage (hex).
     */
    public const string MATERNAL_COLOR_DEFAULT = '#d06f94';

    /**
     * The pattern of an accepted lineage colour, a hash and six hex digits and
     * nothing else, a trailing line break included.
     */
    private const string HEX_COLOR_PATTERN = '/^#[0-9a-fA-F]{6}$/D';

    /**
     * Name of the administration form field carrying the place format. The field
     * name and the key read back from the submitted form have to be the same
     * string, and nothing else enforces that. A mismatch does not error. It makes
     * every save persist the previously stored choice and silently discard the
     * selection. Both sides reference this constant so they cannot drift apart.
     */
    public const string PLACE_FORMAT_PARAM = 'placeFormat';

    /**
     * Hierarchy levels shown when no tree is available to inherit from.
     */
    private const int DEFAULT_PLACE_LEVELS = 1;

    /**
     * The memoised route parameters, resolved on first use.
     *
     * @var array{generations: int, layout: string, openNewTabOnClick: string, showAlternativeName: string, showNicknames: string, showFamilyColors: string, paternalColor: string, maternalColor: string, showAddParentLinks: string, showPlaces: string, showAdditionalFacts: string}|null
     */
    private ?array $routeToggleParams = null;

    // The getters below are each called once per node while the tree is built.
    // AbstractModule::getPreference() runs a `module_setting` query on every
    // call and holds no cache, and Validator::__construct() re-scans all request
    // parameters for valid UTF-8, so both costs would scale with the size of the
    // chart. Each getter therefore returns its memoised value before doing
    // either, an assignment at the return site would be too late because the
    // validator is built above it.

    /**
     * The resolved number of generations to display, or null until first resolved.
     */
    private ?int $generations = null;

    /**
     * The resolved tree layout, or null until first resolved.
     */
    private ?string $layout = null;

    /**
     * Whether a click opens a new tab, or null until first resolved.
     */
    private ?bool $openNewTabOnClick = null;

    /**
     * Whether nicknames are shown, or null until first resolved.
     */
    private ?bool $showNicknames = null;

    /**
     * Whether the alternative name is shown, or null until first resolved.
     */
    private ?bool $showAlternativeName = null;

    /**
     * Whether the SVG export button is hidden, or null until first resolved.
     */
    private ?bool $hideSvgExport = null;

    /**
     * Whether the PNG export button is hidden, or null until first resolved.
     */
    private ?bool $hidePngExport = null;

    /**
     * Whether person boxes are colored by lineage, or null until first resolved.
     */
    private ?bool $showFamilyColors = null;

    /**
     * The resolved paternal color, or null until first resolved.
     */
    private ?string $paternalColor = null;

    /**
     * The resolved maternal color, or null until first resolved.
     */
    private ?string $maternalColor = null;

    /**
     * Whether the add-parent placeholders are shown, or null until first resolved.
     */
    private ?bool $showAddParentLinks = null;

    /**
     * The resolved name-abbreviation strategy, or null until first resolved.
     */
    private ?NameAbbreviation $nameAbbreviation = null;

    /**
     * Whether the places of the facts are shown, or null until first resolved.
     */
    private ?bool $showPlaces = null;

    /**
     * Whether the additional facts of the chart box are shown, or null until first resolved.
     */
    private ?bool $showAdditionalFacts = null;

    /**
     * The stored place format, or null until first resolved.
     */
    private ?PlaceFormatChoice $placeFormatChoice = null;

    /**
     * Configuration constructor.
     *
     * @param ServerRequestInterface $request
     * @param AbstractModule         $module
     * @param Tree|null              $tree    The active tree, used to resolve the automatic place format from
     *                                        its pedigree place preferences, null where no tree exists, such
     *                                        as on the administration page
     */
    public function __construct(
        /**
         * The current request instance.
         */
        private readonly ServerRequestInterface $request,
        private readonly AbstractModule $module,
        private readonly ?Tree $tree = null,
    ) {
    }

    /**
     * Returns the validator for whichever side of the request carries the
     * parameters.
     *
     * Not memoised: every caller is a getter that returns its own memoised value
     * before reaching this, so it runs at most once per setting per request.
     */
    private function requestValidator(): Validator
    {
        if ($this->request->getMethod() === RequestMethodInterface::METHOD_POST) {
            return Validator::parsedBody($this->request);
        }

        return Validator::queryParams($this->request);
    }

    /**
     * Returns the number of generations to display.
     *
     * @return int
     */
    public function getGenerations(): int
    {
        if ($this->generations !== null) {
            return $this->generations;
        }

        $validator = $this->requestValidator();

        return $this->generations = $validator
            ->isBetween(self::MIN_GENERATIONS, self::MAX_GENERATIONS)
            ->integer(
                'generations',
                (int) $this->module->getPreference(
                    'default_generations',
                    (string) self::DEFAULT_GENERATIONS
                )
            );
    }

    /**
     * Returns a list of possible selectable generations.
     *
     * @return string[]
     */
    public function getGenerationsList(): array
    {
        $result = [];

        foreach (range(self::MIN_GENERATIONS, self::MAX_GENERATIONS) as $value) {
            $result[$value] = I18N::number($value);
        }

        return $result;
    }

    /**
     * Returns the tree layout.
     *
     * @return string
     */
    public function getLayout(): string
    {
        if ($this->layout !== null) {
            return $this->layout;
        }

        $validator = $this->requestValidator();

        return $this->layout = $validator
            ->isInArray([
                self::LAYOUT_BOTTOMTOP,
                self::LAYOUT_LEFTRIGHT,
                self::LAYOUT_RIGHTLEFT,
                self::LAYOUT_TOPBOTTOM,
            ])
            ->string(
                'layout',
                $this->module->getPreference(
                    'default_layout',
                    self::DEFAULT_TREE_LAYOUT
                )
            );
    }

    /**
     * Returns the available tree layouts.
     *
     * @return string[]
     */
    public function getLayouts(): array
    {
        if (I18N::direction() === 'rtl') {
            return [
                self::LAYOUT_LEFTRIGHT => view('icons/pedigree-left') . I18N::translate('left'),
                self::LAYOUT_RIGHTLEFT => view('icons/pedigree-right') . I18N::translate('right'),
                self::LAYOUT_BOTTOMTOP => view('icons/pedigree-up') . I18N::translate('up'),
                self::LAYOUT_TOPBOTTOM => view('icons/pedigree-down') . I18N::translate('down'),
            ];
        }

        return [
            self::LAYOUT_RIGHTLEFT => view('icons/pedigree-left') . I18N::translate('left'),
            self::LAYOUT_LEFTRIGHT => view('icons/pedigree-right') . I18N::translate('right'),
            self::LAYOUT_BOTTOMTOP => view('icons/pedigree-up') . I18N::translate('up'),
            self::LAYOUT_TOPBOTTOM => view('icons/pedigree-down') . I18N::translate('down'),
        ];
    }

    /**
     * Returns whether to open a new browser window/tab on left-click on an
     * individual or not.
     *
     * @return bool
     */
    public function getOpenNewTabOnClick(): bool
    {
        if ($this->openNewTabOnClick !== null) {
            return $this->openNewTabOnClick;
        }

        $validator = $this->requestValidator();

        return $this->openNewTabOnClick = $validator
            ->boolean(
                'openNewTabOnClick',
                (bool) $this->module->getPreference(
                    'default_openNewTabOnClick',
                    '1'
                )
            );
    }

    /**
     * Returns true when the legacy GEDCOM `2 NICK` value should be displayed in
     * quotes between the given names and the surname (e.g. `Martin "Chalky"
     * White`). Default off so existing trees keep the post-2.0 webtrees
     * rendering.
     *
     * @return bool
     */
    public function getShowNicknames(): bool
    {
        if ($this->showNicknames !== null) {
            return $this->showNicknames;
        }

        $validator = $this->requestValidator();

        return $this->showNicknames = $validator
            ->boolean(
                'showNicknames',
                (bool) $this->module->getPreference(
                    'default_showNicknames',
                    '0'
                )
            );
    }

    /**
     * Returns whether to show the alternative name of an individual or not.
     *
     * @return bool
     */
    public function getShowAlternativeName(): bool
    {
        if ($this->showAlternativeName !== null) {
            return $this->showAlternativeName;
        }

        $validator = $this->requestValidator();

        return $this->showAlternativeName = $validator
            ->boolean(
                'showAlternativeName',
                (bool) $this->module->getPreference(
                    'default_showAlternativeName',
                    '0'
                )
            );
    }

    /**
     * Returns whether to hide the SVG export button or not.
     *
     * @return bool
     */
    public function getHideSvgExport(): bool
    {
        if ($this->hideSvgExport !== null) {
            return $this->hideSvgExport;
        }

        $validator = $this->requestValidator();

        return $this->hideSvgExport = $validator
            ->boolean(
                'hideSvgExport',
                (bool) $this->module->getPreference(
                    'default_hideSvgExport',
                    '0'
                )
            );
    }

    /**
     * Returns whether to hide the PNG export button or not.
     *
     * @return bool
     */
    public function getHidePngExport(): bool
    {
        if ($this->hidePngExport !== null) {
            return $this->hidePngExport;
        }

        $validator = $this->requestValidator();

        return $this->hidePngExport = $validator
            ->boolean(
                'hidePngExport',
                (bool) $this->module->getPreference(
                    'default_hidePngExport',
                    '0'
                )
            );
    }

    /**
     * Returns whether to color person boxes by paternal/maternal lineage.
     *
     * @return bool
     */
    public function getShowFamilyColors(): bool
    {
        if ($this->showFamilyColors !== null) {
            return $this->showFamilyColors;
        }

        $validator = $this->requestValidator();

        return $this->showFamilyColors = $validator
            ->boolean(
                'showFamilyColors',
                (bool) $this->module->getPreference(
                    'default_showFamilyColors',
                    '1'
                )
            );
    }

    /**
     * Returns the CSS hex color used to tint paternal-side person boxes.
     *
     * @return string
     */
    public function getPaternalColor(): string
    {
        return $this->paternalColor ??= $this->resolveColor('paternalColor', self::PATERNAL_COLOR_DEFAULT);
    }

    /**
     * Returns the CSS hex color used to tint maternal-side person boxes.
     *
     * @return string
     */
    public function getMaternalColor(): string
    {
        return $this->maternalColor ??= $this->resolveColor('maternalColor', self::MATERNAL_COLOR_DEFAULT);
    }

    /**
     * Resolves a lineage colour from the request and the module preference.
     *
     * Only a six digit hex colour is accepted, because the value is written into
     * an inline script and into the links of the chart. A request value that is
     * no hex colour falls back to the module preference, and a module
     * preference that is no hex colour falls back to the built-in default.
     *
     * @param string $name    The name of the request parameter
     * @param string $default The built-in default colour
     *
     * @return string
     */
    private function resolveColor(string $name, string $default): string
    {
        $stored = $this->module->getPreference('default_' . $name, $default);

        if (preg_match(self::HEX_COLOR_PATTERN, $stored) !== 1) {
            $stored = $default;
        }

        $requested = $this->requestValidator()->string($name, $stored);

        return preg_match(self::HEX_COLOR_PATTERN, $requested) === 1 ? $requested : $stored;
    }

    /**
     * Admin-only toggle that decides whether the chart renders a clickable
     * placeholder box for each missing parent slot. The box links to the
     * webtrees core "Add a parent" page so editors can fill the gap from within
     * the chart.
     *
     * @return bool
     */
    public function getShowAddParentLinks(): bool
    {
        if ($this->showAddParentLinks !== null) {
            return $this->showAddParentLinks;
        }

        $validator = $this->requestValidator();

        return $this->showAddParentLinks = $validator
            ->boolean(
                'showAddParentLinks',
                (bool) $this->module->getPreference(
                    'default_showAddParentLinks',
                    '0'
                )
            );
    }

    /**
     * Returns the dropdown options for the name-abbreviation strategy in the
     * admin config form. Keyed by the persisted enum value.
     *
     * @return array<string, string>
     */
    public function getNameAbbreviationList(): array
    {
        return [
            NameAbbreviation::Auto->value    => I18N::translate("Automatic (based on tree's surname tradition)"),
            NameAbbreviation::Given->value   => I18N::translate('Abbreviate given names first'),
            NameAbbreviation::Surname->value => I18N::translate('Abbreviate surnames first'),
        ];
    }

    /**
     * Returns the name-abbreviation strategy as a typed case. The request value
     * wins over the module preference; an unknown or stale value falls back to
     * {@see NameAbbreviation::Auto} instead of leaking through. The chart-render
     * path resolves Auto to Given/Surname via the tree's SURNAME_TRADITION before
     * serialising to the JS config — see {@see Module::getChartParameters()}.
     *
     * @return NameAbbreviation
     */
    public function getNameAbbreviation(): NameAbbreviation
    {
        if ($this->nameAbbreviation instanceof NameAbbreviation) {
            return $this->nameAbbreviation;
        }

        $validator = $this->requestValidator();

        $value = $validator
            ->string(
                'nameAbbreviation',
                $this->module->getPreference(
                    'default_nameAbbreviation',
                    NameAbbreviation::Auto->value
                )
            );

        return $this->nameAbbreviation = NameAbbreviation::tryFrom($value) ?? NameAbbreviation::Auto;
    }

    /**
     * Returns whether the places of the facts are shown in the person boxes.
     *
     * @return bool
     */
    public function getShowPlaces(): bool
    {
        if ($this->showPlaces !== null) {
            return $this->showPlaces;
        }

        $validator = $this->requestValidator();

        return $this->showPlaces = $validator
            ->boolean(
                'showPlaces',
                (bool) $this->module->getPreference(
                    'default_showPlaces',
                    '0'
                )
            );
    }

    /**
     * Returns whether the additional facts of the chart box are shown in the
     * person boxes. The facts are the tags the tree names for the chart box in
     * its preferences, so the default shows nothing for a tree that names none.
     *
     * @return bool
     */
    public function getShowAdditionalFacts(): bool
    {
        if ($this->showAdditionalFacts !== null) {
            return $this->showAdditionalFacts;
        }

        $validator = $this->requestValidator();

        return $this->showAdditionalFacts = $validator
            ->boolean(
                'showAdditionalFacts',
                (bool) $this->module->getPreference(
                    'default_showAdditionalFacts',
                    '1'
                )
            );
    }

    /**
     * Returns the place format that the administrator stored, before the tree
     * preferences are applied. This is the value the administration select shows
     * and the value the chart uses. The request never changes it, so a visitor
     * cannot pick the detail of the places.
     *
     * A stored value that is no choice falls back to the automatic choice.
     *
     * @return PlaceFormatChoice
     */
    public function getPlaceFormatChoice(): PlaceFormatChoice
    {
        return $this->placeFormatChoice ??= PlaceFormatChoice::tryFrom(
            $this->module->getPreference('default_placeFormat', '')
        ) ?? PlaceFormatChoice::Automatic;
    }

    /**
     * Returns the place format that the submitted administration form selects.
     * A submitted value that is no choice keeps the stored one. Only the save of
     * the administration form reads it, the chart never does.
     *
     * @return PlaceFormatChoice
     */
    public function getSubmittedPlaceFormatChoice(): PlaceFormatChoice
    {
        $stored = $this->getPlaceFormatChoice();

        return PlaceFormatChoice::tryFrom(
            $this->requestValidator()->string(self::PLACE_FORMAT_PARAM, $stored->value)
        ) ?? $stored;
    }

    /**
     * Returns the fully resolved formatting instruction. The automatic choice is
     * applied against the pedigree place preferences of the tree here. This is
     * where the tree is available, so the processor stays free of webtrees
     * configuration.
     *
     * It is not memoised, because it reads no module preference of its own. The
     * choice comes from the memoised getPlaceFormatChoice() and the tree caches
     * its preferences.
     *
     * @return PlaceFormatSpec
     */
    public function getPlaceFormat(): PlaceFormatSpec
    {
        if (!$this->tree instanceof Tree) {
            return $this->getPlaceFormatChoice()->toSpec(self::DEFAULT_PLACE_LEVELS, false);
        }

        return $this->getPlaceFormatChoice()->toSpec(
            (int) $this->tree->getPreference('SHOW_PEDIGREE_PLACES'),
            $this->tree->getPreference('SHOW_PEDIGREE_PLACES_SUFFIX') === '1'
        );
    }

    /**
     * Returns the localised labels for the place format select of the
     * administration form, keyed by the stored value. The literals live here, not
     * in the shared package, so xgettext extracts them into the catalogue of this
     * module.
     *
     * @return array<string, string>
     */
    public function getPlaceFormatList(): array
    {
        return [
            PlaceFormatChoice::Automatic->value   => I18N::translate('Automatic (from the tree configuration)'),
            PlaceFormatChoice::Full->value        => I18N::translate('Full place name'),
            PlaceFormatChoice::Levels1->value     => I18N::translate('Lowest level (e.g. parish)'),
            PlaceFormatChoice::Levels2->value     => I18N::translate('Lowest two levels'),
            PlaceFormatChoice::Levels3->value     => I18N::translate('Lowest three levels'),
            PlaceFormatChoice::CityCountry->value => I18N::translate('Place and country'),
            PlaceFormatChoice::CityIso2->value    => I18N::translate('Place and country code (2 letters)'),
            PlaceFormatChoice::CityIso3->value    => I18N::translate('Place and country code (3 letters)'),
        ];
    }

    /**
     * Returns the settings that have to travel with every URL the chart
     * navigates to: the re-centering link of each node, the redirect that turns
     * a form POST into a GET and the URL of the AJAX rebuild. All three read this
     * one list, so a setting cannot reach two of them and be missing from the
     * third.
     *
     * Clicking a person navigates to the page route afresh, so every setting the
     * re-centered page has to restore must travel in the URL. Otherwise that
     * setting silently falls back to the module preference default. The list is
     * therefore the user-settable form fields, not just what the data facade
     * reads. Several settings, such as the lineage colours and
     * `openNewTabOnClick`, are applied by the view rather than the facade and
     * still have to be forwarded. `showAddParentLinks` is the one entry without
     * a form field, because the data facade reads it while building the nodes.
     *
     * `nameAbbreviation` and `placeFormat` are deliberately absent. They are admin
     * preferences with no form field, so they resolve identically on the
     * re-centered page.
     *
     * Memoised because the update route is built once per node, while
     * AbstractModule::getPreference() issues a database query on every call.
     * Resolving every setting per node would put the query count in linear
     * proportion to the tree size. The configuration is constructed per request,
     * so the resolved values cannot go stale within its lifetime.
     *
     * @return array{generations: int, layout: string, openNewTabOnClick: string, showAlternativeName: string, showNicknames: string, showFamilyColors: string, paternalColor: string, maternalColor: string, showAddParentLinks: string, showPlaces: string, showAdditionalFacts: string}
     */
    public function getRouteToggleParams(): array
    {
        return $this->routeToggleParams ??= [
            'generations'         => $this->getGenerations(),
            'layout'              => $this->getLayout(),
            'openNewTabOnClick'   => $this->getOpenNewTabOnClick() ? '1' : '0',
            'showAlternativeName' => $this->getShowAlternativeName() ? '1' : '0',
            'showNicknames'       => $this->getShowNicknames() ? '1' : '0',
            'showFamilyColors'    => $this->getShowFamilyColors() ? '1' : '0',
            'paternalColor'       => $this->getPaternalColor(),
            'maternalColor'       => $this->getMaternalColor(),
            'showAddParentLinks'  => $this->getShowAddParentLinks() ? '1' : '0',
            'showPlaces'          => $this->getShowPlaces() ? '1' : '0',
            'showAdditionalFacts' => $this->getShowAdditionalFacts() ? '1' : '0',
        ];
    }
}
