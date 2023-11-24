<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Facade;

use Fisharebest\Webtrees\Family;
use Fisharebest\Webtrees\I18N;
use Fisharebest\Webtrees\Individual;
use Fisharebest\Webtrees\Module\ModuleCustomInterface;
use MagicSunday\Webtrees\PedigreeChart\Configuration;
use MagicSunday\Webtrees\PedigreeChart\Model\Node;
use MagicSunday\Webtrees\PedigreeChart\Model\NodeData;
use MagicSunday\Webtrees\PedigreeChart\Processor\DateProcessor;
use MagicSunday\Webtrees\PedigreeChart\Processor\ImageProcessor;
use MagicSunday\Webtrees\PedigreeChart\Processor\NameProcessor;

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
     *
     * @var ModuleCustomInterface
     */
    private ModuleCustomInterface $module;

    /**
     * The configuration instance.
     *
     * @var Configuration
     */
    private Configuration $configuration;

    /**
     * @var string
     */
    private string $route;

    /**
     * @param ModuleCustomInterface $module
     *
     * @return DataFacade
     */
    public function setModule(ModuleCustomInterface $module): DataFacade
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
     * @return null|Node
     */
    public function createTreeStructure(Individual $individual): ?Node
    {
        return $this->buildTreeStructure($individual);
    }

    /**
     * Recursively build the data array of the individual ancestors.
     *
     * @param null|Individual $individual The start person
     * @param int             $generation The current generation
     *
     * @return null|Node
     */
    private function buildTreeStructure(?Individual $individual, int $generation = 1): ?Node
    {
        // Maximum generation reached
        if (($individual === null) || ($generation > $this->configuration->getGenerations())) {
            return null;
        }

        $node = new Node(
            $this->getNodeData($generation, $individual)
        );

        /** @var null|Family $family */
        $family = $individual->childFamilies()->first();

        if ($family === null) {
            return $node;
        }

        // Recursively call the method for the parents of the individual
        $fatherTree = $this->buildTreeStructure($family->husband(), $generation + 1);
        $motherTree = $this->buildTreeStructure($family->wife(), $generation + 1);

        // Add an array of child nodes
        if ($fatherTree !== null) {
            $node->addParent($fatherTree);
//            $data['parents'][] = $fatherTree;
        }

        if ($motherTree !== null) {
            $node->addParent($motherTree);
//            $data['parents'][] = $motherTree;
        }

        return $node;
    }

    /**
     * Get the node data required for display the chart.
     *
     * @param int             $generation The generation the person belongs to
     * @param null|Individual $individual The current individual
     *
     * @return NodeData
     */
    private function getNodeData(
        int $generation,
        Individual $individual
    ): NodeData {
        // Create a unique ID for each individual
        static $id = 0;

        $treeData = new NodeData();
        $treeData->setId(++$id)
            ->setGeneration($generation);

        $nameProcessor = new NameProcessor(
            $individual,
            null,
            false
//            $this->configuration->getShowMarriedNames()
        );

        $dateProcessor  = new DateProcessor($individual);
        $imageProcessor = new ImageProcessor($this->module, $individual);

        $fullNN          = $nameProcessor->getFullName();
        $alternativeName = $nameProcessor->getAlternateName($individual);

        $treeData
            ->setXref($individual->xref())
            ->setUrl($individual->url())
            ->setUpdateUrl($this->getUpdateRoute($individual))
            ->setName($fullNN)
            ->setIsNameRtl($this->isRtl($fullNN))
            ->setFirstNames($nameProcessor->getFirstNames())
            ->setLastNames($nameProcessor->getLastNames())
            ->setPreferredName($nameProcessor->getPreferredName())
            ->setAlternativeName($alternativeName)
            ->setIsAltRtl($this->isRtl($alternativeName))
            ->setThumbnail($imageProcessor->getHighlightImageUrl())
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
        array $parameters = []
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
