<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Test\Model;

use MagicSunday\Webtrees\ModuleBase\Model\NameSegment;
use MagicSunday\Webtrees\ModuleBase\Model\NameSegmentKind;
use MagicSunday\Webtrees\ModuleBase\Model\NodeData as SharedNodeData;
use MagicSunday\Webtrees\PedigreeChart\Model\NodeData;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

use function json_decode;
use function json_encode;

use const JSON_THROW_ON_ERROR;

/**
 * Pins the serialised shape of the node data. The JSON contract to the front
 * end is part of the public surface, and the shared node data of module-base
 * serialises the same bytes, so a later switch to that class changes nothing.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
#[CoversClass(NodeData::class)]
final class NodeDataTest extends TestCase
{
    /**
     * The serialised form of a node that has not been filled in.
     */
    private const string EMPTY_JSON
        = '{"id":0,"xref":"","url":"","updateUrl":"","generation":0,"name":"","isNameRtl":false,'
        . '"nameSegments":[],"alternativeName":"",'
        . '"isAltRtl":false,"thumbnail":"","silhouette":"","sex":"U","birth":"","death":"","timespan":""}';

    /**
     * The serialised form of a fully populated node.
     */
    private const string FILLED_JSON
        = '{"id":7,"xref":"X1","url":"\/individual\/X1","updateUrl":"\/chart\/X1","generation":3,'
        . '"name":"Max Mustermann","isNameRtl":true,"nameSegments":['
        . '{"label":"Max","kind":"given","isPreferred":true},{"label":"\"M\u00e4xchen\"","kind":"nickname","isPreferred":false},'
        . '{"label":"Mustermann","kind":"surname","isPreferred":false}],"alternativeName":"Maxi Muster","isAltRtl":true,'
        . '"thumbnail":"\/media\/x.jpg","silhouette":"\/media\/m.svg","sex":"M","birth":"1 JAN 1900",'
        . '"death":"2 FEB 1980","timespan":"1900 - 1980"}';

    /**
     * A node that has not been filled in serialises every key, in the fixed order.
     */
    #[Test]
    public function serialisesAnEmptyNodeInTheFixedKeyOrder(): void
    {
        self::assertSame(self::EMPTY_JSON, json_encode(new NodeData(), JSON_THROW_ON_ERROR));
    }

    /**
     * A filled node serialises its values and its name segments in the fixed order.
     */
    #[Test]
    public function serialisesAFilledNodeInTheFixedKeyOrder(): void
    {
        $nodeData = new NodeData();
        $this->fill($nodeData);

        self::assertSame(self::FILLED_JSON, json_encode($nodeData, JSON_THROW_ON_ERROR));
    }

    /**
     * The node of the module serialises the same bytes as the shared node of
     * module-base, empty and filled alike.
     */
    #[Test]
    public function serialisesTheSameBytesAsTheSharedNodeData(): void
    {
        self::assertSame(
            json_encode(new SharedNodeData(), JSON_THROW_ON_ERROR),
            json_encode(new NodeData(), JSON_THROW_ON_ERROR)
        );

        $shared = new SharedNodeData();
        $own    = new NodeData();

        $this->fill($shared);
        $this->fill($own);

        self::assertSame(
            json_encode($shared, JSON_THROW_ON_ERROR),
            json_encode($own, JSON_THROW_ON_ERROR)
        );
    }

    /**
     * The name segments leave in the order they were set, and the node carries
     * none of the former name part keys.
     */
    #[Test]
    public function keepsTheSegmentOrderAndDropsTheFormerNameKeys(): void
    {
        $nodeData = (new NodeData())->setNameSegments([
            new NameSegment('Schmidt', NameSegmentKind::Surname),
            new NameSegment('Anna', NameSegmentKind::Given, true),
        ]);

        /** @var array{nameSegments: list<array{label: string}>} $serialised */
        $serialised = json_decode(json_encode($nodeData, JSON_THROW_ON_ERROR), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame(['Schmidt', 'Anna'], array_column($serialised['nameSegments'], 'label'));

        foreach (['firstNames', 'lastNames', 'preferredName', 'nickname'] as $removedKey) {
            self::assertArrayNotHasKey($removedKey, $serialised);
        }
    }

    /**
     * Fills a node with a full set of values.
     */
    private function fill(NodeData|SharedNodeData $nodeData): void
    {
        $nodeData
            ->setId(7)
            ->setXref('X1')
            ->setUrl('/individual/X1')
            ->setUpdateUrl('/chart/X1')
            ->setGeneration(3)
            ->setName('Max Mustermann')
            ->setIsNameRtl(true)
            ->setNameSegments([
                new NameSegment('Max', NameSegmentKind::Given, true),
                new NameSegment('"Mäxchen"', NameSegmentKind::Nickname),
                new NameSegment('Mustermann', NameSegmentKind::Surname),
            ])
            ->setAlternativeName('Maxi Muster')
            ->setIsAltRtl(true)
            ->setThumbnail('/media/x.jpg')
            ->setSilhouette('/media/m.svg')
            ->setSex('M')
            ->setBirth('1 JAN 1900')
            ->setDeath('2 FEB 1980')
            ->setTimespan('1900 - 1980');
    }
}
