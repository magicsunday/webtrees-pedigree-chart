<?php
/**
 * See LICENSE.md file for further details.
 */
declare(strict_types=1);

namespace MagicSunday\Webtrees;

use Fisharebest\Webtrees\Exceptions\IndividualAccessDeniedException;
use Fisharebest\Webtrees\Exceptions\IndividualNotFoundException;
use Fisharebest\Webtrees\I18N;
use Fisharebest\Webtrees\Individual;
use Fisharebest\Webtrees\Menu;
use Fisharebest\Webtrees\Module\AbstractModule;
use Fisharebest\Webtrees\Module\ModuleChartInterface;
use Fisharebest\Webtrees\Theme;
use Fisharebest\Webtrees\Theme\ThemeInterface;
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
class PedigreeChartModule extends AbstractModule implements ModuleChartInterface
{
    /**
     * For custom modules - optional (recommended) version number
     *
     * @var string
     */
    const CUSTOM_VERSION = '1.0';

    /**
     * For custom modules - link for support, upgrades, etc.
     *
     * @var string
     */
    const CUSTOM_WEBSITE = 'https://github.com/magicsunday/webtrees-pedigree-chart';

    /**
     * Minimum number of displayable generations.
     *
     * @var int
     */
    const MIN_GENERATIONS = 2;

    /**
     * Maximum number of displayable generations.
     *
     * @var int
     */
    const MAX_GENERATIONS = 99;

    /**
     * The current theme instance.
     *
     * @var ThemeInterface
     */
    private $theme;

    /**
     * The current tree instance.
     *
     * @var Tree
     */
    private $tree;

    /**
     * How should this module be labelled on tabs, menus, etc.?
     *
     * @return string
     */
    public function getTitle(): string
    {
        return I18N::translate('Pedigree chart');
    }

    /**
     * A sentence describing what this module does.
     *
     * @return string
     */
    public function getDescription(): string
    {
        return I18N::translate('A pedigree chart of an individual.');
    }

    /**
     * Return a menu item for this chart.
     *
     * @param Individual $individual Current individual instance
     *
     * @return Menu
     */
    public function getChartMenu(Individual $individual): Menu
    {
        $link = route('module', [
            'module' => $this->getName(),
            'action' => 'PedigreeChart',
            'xref'   => $individual->getXref(),
            'ged'    => $individual->getTree()->getName(),
        ]);

        return new Menu(
            $this->getTitle(),
            $link,
            'menu-chart-pedigree',
            [
                'rel' => 'nofollow',
            ]
        );
    }

    /**
     * Return a menu item for this chart - for use in individual boxes.
     *
     * @param Individual $individual Current individual instance
     *
     * @return Menu
     */
    public function getBoxChartMenu(Individual $individual): Menu
    {
        return $this->getChartMenu($individual);
    }

    /**
     * Entry point action. Creates the form to configure the chart.
     *
     * @param Request $request The current HTTP request
     * @param Tree    $tree    The current tree
     *
     * @return Response
     *
     * @throws \Exception
     */
    public function getPedigreeChartAction(Request $request, Tree $tree): Response
    {
        $this->theme = Theme::theme();
        $this->tree  = $tree;

        $xref       = $request->get('xref');
        $individual = Individual::getInstance($xref, $this->tree);

        if ($individual === null) {
            throw new IndividualNotFoundException();
        }

        if (!$individual->canShow()) {
            throw new IndividualAccessDeniedException();
        }

        $title = I18N::translate('Pedigree chart');

        if ($individual->canShowName()) {
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
    private function getGeneration(Request $request)
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
    private function unescapedHtml(string $value = null)
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

        if ($individual->canShow() && $individual->getTree()->getPreference('SHOW_HIGHLIGHT_IMAGES')) {
            $thumbnail = $individual->displayImage(40, 50, 'crop', []);
        } else {
            $thumbnail = '';
        }

        return [
            'id'              => 0,
            'xref'            => $individual->getXref(),
            'generation'      => $generation,
            'name'            => $fullName,
            'alternativeName' => $alternativeName,
            'isAltRtl'        => $this->isRtl($alternativeName),
            'thumbnail'       => $thumbnail,
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
        if ($individual !== null) {
            if ($individual->getSex() === 'M') {
                return '#' . $this->theme->parameter('chart-background-m');
            }

            if ($individual->getSex() === 'F') {
                return '#' . $this->theme->parameter('chart-background-f');
            }
        }

        return '#' . $this->theme->parameter('chart-background-u');
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
