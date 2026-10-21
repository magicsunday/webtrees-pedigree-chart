<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Model;

use JsonSerializable;
use MagicSunday\Webtrees\ModuleBase\Model\NodeData;

/**
 * This class holds information about a node.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
final class Node implements JsonSerializable
{
    /**
     * The list of parents.
     *
     * @var Node[]
     */
    private array $parents = [];

    /**
     * Constructor.
     *
     * @param NodeData $data
     */
    public function __construct(private readonly NodeData $data)
    {
    }

    /**
     * @param Node $parent
     *
     * @return Node
     */
    public function addParent(Node $parent): Node
    {
        $this->parents[] = $parent;

        return $this;
    }

    /**
     * Returns the relevant data as an array.
     *
     * @return array<string, int|int[]|NodeData|Node[]>
     */
    public function jsonSerialize(): array
    {
        $jsonData = [
            'data' => $this->data,
        ];

        if ($this->parents !== []) {
            $jsonData['parents'] = $this->parents;
        }

        return $jsonData;
    }
}
