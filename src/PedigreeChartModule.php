<?php
/**
 * See LICENSE.md file for further details.
 */
declare(strict_types=1);

namespace MagicSunday\Webtrees;

use Fisharebest\Webtrees\Auth;
use Fisharebest\Webtrees\Contracts\UserInterface;
use Fisharebest\Webtrees\Exceptions\IndividualAccessDeniedException;
use Fisharebest\Webtrees\Exceptions\IndividualNotFoundException;
use Fisharebest\Webtrees\I18N;
use Fisharebest\Webtrees\Individual;
use Fisharebest\Webtrees\Module\ModuleCustomInterface;
use Fisharebest\Webtrees\Module\ModuleThemeInterface;
use Fisharebest\Webtrees\Module\PedigreeChartModule as WebtreesPedigreeChartModule;
use Fisharebest\Webtrees\Services\ChartService;
use Fisharebest\Webtrees\Tree;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Pedigree chart module class.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/ancestral-fan-chart/
 */
class PedigreeChartModule extends WebtreesPedigreeChartModule implements ModuleCustomInterface
{
    /**
     * For custom modules - optional (recommended) version number
     *
     * @var string
     */
    public const CUSTOM_VERSION = '1.0';

    /**
     * For custom modules - link for support, upgrades, etc.
     *
     * @var string
     */
    public const CUSTOM_WEBSITE = 'https://github.com/magicsunday/webtrees-pedigree-chart';

    /**
     * Minimum number of displayable generations.
     *
     * @var int
     */
    public const MIN_GENERATIONS = 2;

    /**
     * Maximum number of displayable generations.
     *
     * @var int
     */
    public const MAX_GENERATIONS = 25;

    /**
     * The current theme instance.
     *
     * @var ModuleThemeInterface
     */
    private $theme;

    /**
     * The current tree instance.
     *
     * @var Tree
     */
    private $tree;

    /**
     * @inheritDoc
     */
    public function customModuleAuthorName(): string
    {
        return 'Rico Sonntag';
    }

    /**
     * @inheritDoc
     */
    public function customModuleVersion(): string
    {
        return self::CUSTOM_VERSION;
    }

    /**
     * @inheritDoc
     */
    public function customModuleLatestVersionUrl(): string
    {
        return self::CUSTOM_WEBSITE;
    }

    /**
     * @inheritDoc
     */
    public function customModuleSupportUrl(): string
    {
        return self::CUSTOM_WEBSITE;
    }

    /**
     * @inheritDoc
     *
     * @throws IndividualNotFoundException
     * @throws IndividualAccessDeniedException
     */
    public function getChartAction(
        Request $request,
        Tree $tree,
        UserInterface $user,
        ChartService $chart_service
    ): Response {
        $this->theme = app()->make(ModuleThemeInterface::class);
        $this->tree  = $tree;

        $xref       = $request->get('xref');
        $individual = Individual::getInstance($xref, $this->tree);

        Auth::checkIndividualAccess($individual);
        Auth::checkComponentAccess($this, 'chart', $tree, $user);

        $title = I18N::translate('Pedigree chart');

        if ($individual && $individual->canShowName()) {
            $title = I18N::translate('Pedigree chart of %s', $individual->getFullName());
        }

        $generations = $this->getGeneration($request);

        $showEmptyBoxes = (bool) $request->get('showEmptyBoxes');

        $chartParams = [
            'rtl'            => I18N::direction() === 'rtl',
            'generations'    => $generations,
            'showEmptyBoxes' => $showEmptyBoxes,
            'defaultColor'   => $this->getColor(),
            'fontColor'      => $this->getChartFontColor(),
            'individualUrl'  => $this->getIndividualRoute(),
            'data'           => $this->buildJsonTree(1, $generations, $individual),
            'labels'         => [
                'zoom' => I18N::translate('Use Ctrl + scroll to zoom in the view'),
                'move' => I18N::translate('Move the view with two fingers'),
            ],
        ];

        return $this->viewResponse(
            'webtrees-pedigree-chart',
            [
                'rtl'            => I18N::direction() === 'rtl',
                'title'          => $title,
                'moduleName'     => $this->name(),
                'individual'     => $individual,
                'tree'           => $this->tree,
                'generations'    => $generations,
                'chartParams'    => json_encode($chartParams),
                'showEmptyBoxes' => $showEmptyBoxes,
            ]
        );
    }

    /**
     * Returns the current generation.
     *
     * @param Request $request The request
     *
     * @return int
     */
    private function getGeneration(Request $request): int
    {
        // Get default number of generations to display
        $default     = $this->tree->getPreference('DEFAULT_PEDIGREE_GENERATIONS');
        $generations = (int) $request->get('generations', $default);

        return max(min($generations, self::MAX_GENERATIONS), self::MIN_GENERATIONS);
    }

    /**
     * Returns the unescaped HTML string.
     *
     * @param string $value The value to strip the HTML tags from
     *
     * @return null|string
     */
    private function unescapedHtml(string $value = null): ?string
    {
        if ($value === null) {
            return $value;
        }

        return html_entity_decode(strip_tags($value), ENT_QUOTES, 'UTF-8');
    }

    /**
     * Returns whether the given text is in RTL style or not.
     *
     * @param string $text The text to check
     *
     * @return bool
     */
    private function isRtl(string $text = null): bool
    {
        return $text ? I18N::scriptDirection(I18N::textScript($text)) === 'rtl' : false;
    }

    /**
     * Returns the URL of the highlight image of an individual.
     *
     * @param Individual $individual The current individual
     *
     * @return string
     */
    private function getIndividualImage(Individual $individual): string
    {
        if ($individual->canShow()
            && $individual->tree()->getPreference('SHOW_HIGHLIGHT_IMAGES')
        ) {
            $mediaFile = $individual->findHighlightedMediaFile();

            if ($mediaFile !== null) {
                return $mediaFile->imageUrl(250, 250, 'crop');
            }
        }

        return '';
    }

    /**
     * Get the individual data required for display the chart.
     *
     * @param Individual $individual The start person
     * @param int        $generation The generation the person belongs to
     *
     * @return array
     */
    private function getIndividualData(Individual $individual, int $generation): array
    {
        $fullName        = $this->unescapedHtml($individual->getFullName());
        $alternativeName = $this->unescapedHtml($individual->getAddName());

        return [
            'id'              => 0,
            'xref'            => $individual->xref(),
            'generation'      => $generation,
            'name'            => $fullName,
            'alternativeName' => $alternativeName,
            'isAltRtl'        => $this->isRtl($alternativeName),
            'thumbnail'       => $this->getIndividualImage($individual),
            'sex'             => $individual->getSex(),
            'born'            => $individual->getBirthDate()->minimumDate()->format('%d.%m.%Y'),
            'died'            => $individual->getDeathDate()->minimumDate()->format('%d.%m.%Y'),
            'color'           => $this->getColor($individual),
            'colors'          => [[], []],
        ];
    }

    /**
     * Recursively build the data array of the individual ancestors.
     *
     * @param int             $generation    The current generation
     * @param int             $maxGeneration Limits the number of generations in the tree to this number
     * @param null|Individual $individual    The start person
     *
     * @return array
     */
    private function buildJsonTree(int $generation, int $maxGeneration, Individual $individual = null): array
    {
        // Maximum generation reached
        if (($generation > $maxGeneration) || ($individual === null)) {
            return [];
        }

        $data   = $this->getIndividualData($individual, $generation);
        $family = $individual->getPrimaryChildFamily();

        if ($family === null) {
            return $data;
        }

        // Recursively call the method for the parents of the individual
        $fatherTree = $this->buildJsonTree($generation + 1, $maxGeneration, $family->getHusband());
        $motherTree = $this->buildJsonTree($generation + 1, $maxGeneration, $family->getWife());

        // Add array of child nodes
        if ($fatherTree) {
            $data['children'][] = $fatherTree;
        }

        if ($motherTree) {
            $data['children'][] = $motherTree;
        }

        return $data;
    }

    /**
     * Get the raw individual URL. The "xref" parameter must be the last one as the URL gets appended
     * with the clicked individual id in order to link to the right individual page.
     *
     * @return string
     */
    private function getIndividualRoute(): string
    {
        return route('individual', ['xref' => '']);
    }

    /**
     * Get the default colors based on the gender of an individual.
     *
     * @param null|Individual $individual Individual instance
     *
     * @return string HTML color code
     */
    private function getColor(Individual $individual = null): string
    {
        $genderLower = ($individual === null) ? 'u' : strtolower($individual->getSex());
        return '#' . $this->theme->parameter('chart-background-' . $genderLower);
    }

    /**
     * Get the theme defined chart font color.
     *
     * @return string HTML color code
     */
    private function getChartFontColor(): string
    {
        return '#' . $this->theme->parameter('chart-font-color');
    }
}
