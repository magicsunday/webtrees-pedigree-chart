<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Test\View;

use DOMElement;
use DOMXPath;
use Fig\Http\Message\RequestMethodInterface;
use GuzzleHttp\Psr7\ServerRequest;
use MagicSunday\Webtrees\ModuleBase\Testing\EnglishLocaleFixture;
use MagicSunday\Webtrees\ModuleBase\Testing\MarkupFixture;
use MagicSunday\Webtrees\PedigreeChart\Configuration;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\ModuleSettingsFixtureTrait;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\RightToLeftLocaleFixture;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\ViewFixture;
use PHPUnit\Framework\Attributes\CoversNothing;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

use function ob_get_clean;
use function ob_start;
use function trim;

/**
 * Tests the wording of the orientation part of the form.
 *
 * The module words these texts differently from the webtrees core, so each text carries the name
 * of the module as its context. A language without an entry for that context keeps the wording of
 * the core.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
#[CoversNothing]
final class OrientationFormViewTest extends TestCase
{
    use ModuleSettingsFixtureTrait;

    /**
     * The catalogues of the cases by source text. A key with the context of the module holds the
     * wording of the module, a plain key holds the wording of the core.
     *
     * @return array<string, array{array<string, string>, string, array{string, string, string, string}}>
     */
    public static function wordingProvider(): array
    {
        $context = "webtrees-pedigree-chart\x04";

        return [
            'the module wording of the context wins' => [
                [
                    $context . 'Orientation' => 'Ausrichtung',
                    $context . 'left'        => 'Links',
                    $context . 'right'       => 'Rechts',
                    $context . 'up'          => 'Oben',
                    $context . 'down'        => 'Unten',
                    'Orientation'            => 'Richtung',
                    'left'                   => 'links',
                    'right'                  => 'rechts',
                    'up'                     => 'hoch',
                    'down'                   => 'unten',
                ],
                'Ausrichtung',
                ['Links', 'Rechts', 'Oben', 'Unten'],
            ],
            'a language without a context keeps the core wording' => [
                [
                    'Orientation' => 'Richtung',
                    'left'        => 'links',
                    'right'       => 'rechts',
                    'up'          => 'hoch',
                    'down'        => 'unten',
                ],
                'Richtung',
                ['links', 'rechts', 'hoch', 'unten'],
            ],
            'no translation keeps the source text' => [
                [],
                'Orientation',
                ['left', 'right', 'up', 'down'],
            ],
        ];
    }

    /**
     * The heading and the direction labels of the form show the wording that the catalogue gives
     * them, and each layout keeps the label of its direction.
     *
     * @param array<string, string>                 $messages The translations by source text
     * @param string                                $heading  The expected heading
     * @param array{string, string, string, string} $labels   The expected texts of the directions left, right, up and down
     */
    #[Test]
    #[DataProvider('wordingProvider')]
    public function showsTheWordingOfTheCatalogueForTheHeadingAndTheDirections(array $messages, string $heading, array $labels): void
    {
        $xpath = MarkupFixture::xpathOf($this->render($messages));

        self::assertSame(
            $heading,
            trim(MarkupFixture::first($xpath, '//div[contains(@class, "wt-page-options-label")]')->textContent)
        );
        self::assertSame(
            [
                Configuration::LAYOUT_RIGHTLEFT => $labels[0],
                Configuration::LAYOUT_LEFTRIGHT => $labels[1],
                Configuration::LAYOUT_BOTTOMTOP => $labels[2],
                Configuration::LAYOUT_TOPBOTTOM => $labels[3],
            ],
            $this->labelsByLayout($xpath)
        );
    }

    /**
     * In a language that is written from right to left the layouts that run along the line swap
     * their directions, and every layout still keeps the label of its direction.
     */
    #[Test]
    public function swapsTheLayoutsOfTheHorizontalDirectionsInALanguageWrittenFromRightToLeft(): void
    {
        $context = "webtrees-pedigree-chart\x04";

        $xpath = MarkupFixture::xpathOf($this->render(
            [
                $context . 'left'  => 'Links',
                $context . 'right' => 'Rechts',
                $context . 'up'    => 'Oben',
                $context . 'down'  => 'Unten',
            ],
            true
        ));

        self::assertSame(
            [
                Configuration::LAYOUT_LEFTRIGHT => 'Links',
                Configuration::LAYOUT_RIGHTLEFT => 'Rechts',
                Configuration::LAYOUT_BOTTOMTOP => 'Oben',
                Configuration::LAYOUT_TOPBOTTOM => 'Unten',
            ],
            $this->labelsByLayout($xpath)
        );
    }

    /**
     * Returns the text of each radio label by the layout that its radio button submits.
     *
     * @return array<string, string>
     */
    private function labelsByLayout(DOMXPath $xpath): array
    {
        $labels = [];

        foreach (MarkupFixture::elements($xpath, '//label[@class="radio"]') as $label) {
            $radio = $label->getElementsByTagName('input')->item(0);

            self::assertInstanceOf(DOMElement::class, $radio, 'each label belongs to a radio button');

            $labels[$radio->getAttribute('value')] = trim($label->textContent);
        }

        return $labels;
    }

    /**
     * Renders the orientation part of the form with the given translations.
     *
     * @param array<string, string> $messages The translations by source text
     * @param bool                  $rtl      Whether the language is written from right to left
     */
    private function render(array $messages, bool $rtl = false): string
    {
        ViewFixture::register();

        if ($rtl) {
            RightToLeftLocaleFixture::install($messages);
        } else {
            EnglishLocaleFixture::install($messages);
        }

        $configuration = new Configuration(
            new ServerRequest(RequestMethodInterface::METHOD_GET, '/'),
            $this->createModuleWithPreferences([])
        );

        ob_start();

        include __DIR__ . '/../../resources/views/modules/pedigree-chart/form/orientation.phtml';

        $markup = ob_get_clean();

        self::assertIsString($markup);

        return $markup;
    }
}
