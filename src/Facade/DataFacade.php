<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Facade;

use Fisharebest\Webtrees\Family;
use Fisharebest\Webtrees\Http\RequestHandlers\AddParentToIndividualPage;
use Fisharebest\Webtrees\I18N;
use Fisharebest\Webtrees\Individual;
use Fisharebest\Webtrees\Module\ModuleCustomInterface;
use MagicSunday\Webtrees\ModuleBase\Contract\ModuleAssetUrlInterface;
use MagicSunday\Webtrees\ModuleBase\Processor\DateProcessor;
use MagicSunday\Webtrees\ModuleBase\Processor\ImageProcessor;
use MagicSunday\Webtrees\ModuleBase\Processor\NameProcessor;
use MagicSunday\Webtrees\PedigreeChart\Configuration;
use MagicSunday\Webtrees\PedigreeChart\Model\Node;
use MagicSunday\Webtrees\PedigreeChart\Model\NodeData;

/**
 * Facade class to hide complex logic to generate the structure required to display the tree.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
class DataFacade
{
    /**
     * The module.
     */
    private ModuleCustomInterface&ModuleAssetUrlInterface $module;

    /**
     * The configuration instance.
     */
    private Configuration $configuration;

    private string $route;

    /**
     * @param ModuleCustomInterface&ModuleAssetUrlInterface $module
     *
     * @return DataFacade
     */
    public function setModule(ModuleCustomInterface&ModuleAssetUrlInterface $module): DataFacade
    {
        $this->module = $module;

        return $this;
    }

    /**
     * @param Configuration $configuration
     *
     * @return DataFacade
     */
    public function setConfiguration(Configuration $configuration): DataFacade
    {
        $this->configuration = $configuration;

        return $this;
    }

    /**
     * @param string $route
     *
     * @return DataFacade
     */
    public function setRoute(string $route): DataFacade
    {
        $this->route = $route;

        return $this;
    }

    /**
     * Creates the JSON tree structure.
     *
     * @param Individual $individual
     *
     * @return Node|null
     */
    public function createTreeStructure(Individual $individual): ?Node
    {
        return $this->buildTreeStructure($individual);
    }

    /**
     * Recursively build the data array of the individual ancestors.
     *
     * @param Individual|null $individual The start person
     * @param int             $generation The current generation
     *
     * @return Node|null
     */
    private function buildTreeStructure(?Individual $individual, int $generation = 1): ?Node
    {
        // Maximum generation reached
        if ((!$individual instanceof Individual) || ($generation > $this->configuration->getGenerations())) {
            return null;
        }

        $node = new Node(
            $this->getNodeData($generation, $individual)
        );

        /** @var Family|null $family */
        $family = $individual->childFamilies()->first();

        if ($family === null) {
            return $node;
        }

        // Recursively call the method for the parents of the individual
        $fatherNode = $this->buildTreeStructure($family->husband(), $generation + 1);
        $motherNode = $this->buildTreeStructure($family->wife(), $generation + 1);

        // Add an array of child nodes
        if ($fatherNode instanceof Node) {
            $node->addParent($fatherNode);
        } elseif ($this->shouldOfferAddParent($individual, $generation)) {
            $node->addParent($this->createAddParentPlaceholder($individual, 'M', $generation + 1));
        }

        if ($motherNode instanceof Node) {
            $node->addParent($motherNode);
        } elseif ($this->shouldOfferAddParent($individual, $generation)) {
            $node->addParent($this->createAddParentPlaceholder($individual, 'F', $generation + 1));
        }

        return $node;
    }

    /**
     * Returns true when an "add parent" placeholder should be rendered
     * next to the given individual: the admin toggle is on, the user can
     * edit this individual, and there is at least one more configured
     * generation slot available for the placeholder.
     *
     * @param Individual $individual
     * @param int        $generation
     *
     * @return bool
     */
    private function shouldOfferAddParent(Individual $individual, int $generation): bool
    {
        return $this->configuration->getShowAddParentLinks()
            && ($generation < $this->configuration->getGenerations())
            && $individual->canEdit();
    }

    /**
     * Builds a placeholder Node that the JS layer treats as an
     * "Add a parent" call-to-action. The empty xref signals "no
     * individual"; the populated url is the webtrees core route that
     * opens the matching add-parent form.
     *
     * @param Individual $childIndividual The individual whose parent is missing
     * @param string     $sex             'M' for father, 'F' for mother
     * @param int        $generation      Generation index of the placeholder itself
     *
     * @return Node
     */
    private function createAddParentPlaceholder(
        Individual $childIndividual,
        string $sex,
        int $generation,
    ): Node {
        static $id = 0;

        $url = route(AddParentToIndividualPage::class, [
            'tree' => $childIndividual->tree()->name(),
            'xref' => $childIndividual->xref(),
            'sex'  => $sex,
        ]);

        $name = $sex === 'M'
            ? I18N::translate('Add a father')
            : I18N::translate('Add a mother');

        $treeData = new NodeData();
        $treeData
            ->setId(--$id)
            ->setGeneration($generation)
            ->setXref('')
            ->setUrl($url)
            ->setName($name)
            ->setSex($sex);

        return new Node($treeData);
    }

    /**
     * Get the node data required for display the chart.
     *
     * @param int        $generation The generation the person belongs to
     * @param Individual $individual The current individual
     *
     * @return NodeData
     */
    private function getNodeData(
        int $generation,
        Individual $individual,
    ): NodeData {
        // Create a unique ID for each individual
        static $id = 0;

        $nameProcessor  = new NameProcessor($individual);
        $dateProcessor  = new DateProcessor($individual);
        $imageProcessor = new ImageProcessor($this->module, $individual);

        $showNicknames = $this->configuration->getShowNicknames();
        $fullNN        = $showNicknames
            ? $nameProcessor->getFullNameWithNickname()
            : $nameProcessor->getFullName();
        $alternativeName = $nameProcessor->getAlternateName($individual);

        $treeData = new NodeData();
        $treeData
            ->setId(++$id)
            ->setGeneration($generation)
            ->setXref($individual->xref())
            ->setUrl($individual->url())
            ->setUpdateUrl($this->getUpdateRoute($individual))
            ->setName($fullNN)
            ->setIsNameRtl($this->isRtl($fullNN))
            ->setFirstNames($nameProcessor->getFirstNames())
            ->setLastNames($nameProcessor->getLastNames())
            ->setPreferredName($nameProcessor->getPreferredName())
            ->setNickname($showNicknames ? $nameProcessor->getNickname() : '')
            ->setAlternativeName($alternativeName)
            ->setIsAltRtl($this->isRtl($alternativeName))
            ->setThumbnail($imageProcessor->getHighlightImageUrl())
            ->setSilhouette($imageProcessor->getSilhouetteUrl())
            ->setSex($individual->sex())
            ->setBirth($dateProcessor->getBirthDate())
            ->setDeath($dateProcessor->getDeathDate())
            ->setTimespan($dateProcessor->getLifetimeDescription())
            ->setIndividual($individual);

        return $treeData;
    }

    /**
     * Get the raw update URL. The "xref" parameter must be the last one as the URL gets appended
     * with the clicked individual id in order to load the required chart data.
     *
     * @param Individual $individual
     *
     * @return string
     */
    private function getUpdateRoute(Individual $individual): string
    {
        return $this->chartUrl(
            $individual,
            [
                'generations' => $this->configuration->getGenerations(),
                'layout'      => $this->configuration->getLayout(),
            ]
        );
    }

    /**
     * @param Individual                $individual
     * @param array<string, int|string> $parameters
     *
     * @return string
     */
    private function chartUrl(
        Individual $individual,
        array $parameters = [],
    ): string {
        return route(
            $this->route,
            [
                'xref' => $individual->xref(),
                'tree' => $individual->tree()->name(),
            ] + $parameters
        );
    }

    /**
     * Returns whether the given text is in RTL style or not.
     *
     * @param string $text The text to check
     *
     * @return bool
     */
    private function isRtl(string $text): bool
    {
        return I18N::scriptDirection(I18N::textScript($text)) === 'rtl';
    }
}
