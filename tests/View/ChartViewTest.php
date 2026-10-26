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
     * Every JSON value of the script that can carry text is written with the tag, ampersand and quote
     * characters as escapes, the labels, the style sheets, the asset URL and the abbreviation as well as
     * the chart data. The generated element id is not JSON and stays as it is.
     */
    #[Test]
    public function everyJsonValueOfTheScriptIsEscaped(): void
    {
        $hostile = '<!--<script>';
        $escaped = '\\u003C!--\\u003Cscript\\u003E';

        $output = $this->render(
            [],
            [],
            ['labels' => ['zoom' => $hostile, 'move' => '&'], 'nameAbbreviation' => $hostile],
            [$hostile]
        );

        self::assertStringNotContainsString('<!--', $output);
        self::assertSame(1, substr_count($output, '<script'), 'only the script element of the view opens');
        self::assertStringContainsString('asset=1\\u0026hash=2', $output);
        self::assertStringContainsString('"zoom":"' . $escaped . '"', $output);
        self::assertStringContainsString('"move":"\\u0026"', $output);
        self::assertStringContainsString('cssFiles: ["' . $escaped . '"]', $output);
        self::assertStringContainsString('nameAbbreviation: "' . $escaped . '"', $output);
        self::assertStringContainsString('-container-abc', $output);
    }

    /**
     * The panel switch reaches the chart as the server value, which the browser storage cannot
     * override because the server reads the facts only while it is on, and the options of the
     * removed box rows are gone.
     */
    #[Test]
    public function handsTheDetailPanelSwitchToTheChartAndNoBoxRowOptions(): void
    {
        $output = $this->render([]);

        self::assertStringContainsString('showDetailPanel: false,', $output);
        self::assertStringNotContainsString('opts.showDetailPanel', $output);

        // The value is the one of the configuration, not a constant of the view
        $enabled = $this->render([], ['default_showDetailPanel' => '1']);

        self::assertStringContainsString('showDetailPanel: true,', $enabled);
        self::assertStringNotContainsString('showPlaces', $output);
        self::assertStringNotContainsString('showAdditionalFacts', $output);
        self::assertStringNotContainsString('optionalRows', $output);
    }

    /**
     * Renders the view with the variables of the chart action and returns the page together with
     * the script that the view pushes onto the javascript stack.
     *
     * @param array<string, list<array<string, string>>> $chartData         The chart data tree
     * @param array<string, string>                      $preferences       The module preferences of the test
     * @param array<string, mixed>                       $chartParamsChange Values that replace the chart parameters
     * @param list<string>                               $stylesheets       The style sheets of the SVG export
     */
    private function render(
        array $chartData,
        array $preferences = [],
        array $chartParamsChange = [],
        array $stylesheets = [],
    ): string {
        $javascript    = 'https://example.test/pedigree-chart.js?asset=1&hash=2';
        $configuration = new Configuration(
            new ServerRequest(RequestMethodInterface::METHOD_GET, '/'),
            $this->createModuleWithPreferences($preferences)
        );
        $id          = 'abc';
        $chartParams = [
            'rtl'              => false,
            'nameAbbreviation' => 'GIVEN',
            'labels'           => ['zoom' => 'Zoom', 'move' => 'Move'],
            ...$chartParamsChange,
        ];
        $exportStylesheets = $stylesheets;
        $data              = $chartData;

        View::stack('javascript');

        ob_start();

        include __DIR__ . '/../../resources/views/modules/pedigree-chart/chart.phtml';

        return ob_get_clean() . View::stack('javascript');
    }
}
