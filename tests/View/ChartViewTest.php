<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Test\View;

use Fig\Http\Message\RequestMethodInterface;
use Fisharebest\Webtrees\View;
use GuzzleHttp\Psr7\ServerRequest;
use MagicSunday\Webtrees\PedigreeChart\Configuration;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\ModuleSettingsFixtureTrait;
use PHPUnit\Framework\Attributes\CoversNothing;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

use function ob_get_clean;
use function ob_start;
use function substr_count;

/**
 * Renders the chart view of the pedigree chart and looks at the script that it emits.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
#[CoversNothing]
final class ChartViewTest extends TestCase
{
    use ModuleSettingsFixtureTrait;

    /**
     * The value of a fact or a place is free text of an editor. In an inline script the opener of
     * an HTML comment followed by the opener of a script element switches the parser of the page
     * into a state where the closing tag of the script no longer ends it, so the data of the chart
     * must not carry those sequences raw.
     */
    #[Test]
    public function aFactValueCannotBreakOutOfTheInlineScript(): void
    {
        $hostile = '<!--<script>&\'"';

        $output = $this->render([
            'facts' => [
                [
                    'tag'       => 'OCCU',
                    'label'     => 'Occupation',
                    'date'      => '',
                    'place'     => $hostile,
                    'placeFull' => $hostile,
                    'value'     => $hostile,
                ],
            ],
        ]);

        self::assertStringNotContainsString('<!--', $output);
        self::assertSame(1, substr_count($output, '<script'), 'only the script element of the view opens');
        self::assertSame(1, substr_count($output, '</script>'), 'only the script element of the view closes');
        self::assertStringContainsString('\\u003C!--\\u003Cscript\\u003E\\u0026\\u0027\\u0022', $output);
    }

    /**
     * Renders the view with the variables of the chart action and returns the page together with
     * the script that the view pushes onto the javascript stack.
     *
     * @param array<string, list<array<string, string>>> $chartData The chart data tree
     */
    private function render(array $chartData): string
    {
        $javascript    = 'https://example.test/pedigree-chart.js?asset=1&hash=2';
        $configuration = new Configuration(
            new ServerRequest(RequestMethodInterface::METHOD_GET, '/'),
            $this->createModuleWithPreferences([])
        );
        $id          = 'abc';
        $chartParams = [
            'rtl'              => false,
            'nameAbbreviation' => 'GIVEN',
            'optionalRows'     => 2,
            'labels'           => ['zoom' => 'Zoom', 'move' => 'Move'],
        ];
        $exportStylesheets = [];
        $data              = $chartData;

        View::stack('javascript');

        ob_start();

        include __DIR__ . '/../../resources/views/modules/pedigree-chart/chart.phtml';

        return ob_get_clean() . View::stack('javascript');
    }
}
