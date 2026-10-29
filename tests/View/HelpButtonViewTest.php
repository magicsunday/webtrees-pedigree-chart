<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Test\View;

use MagicSunday\Webtrees\PedigreeChart\Test\Support\EnglishLocaleFixture;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\ViewFixture;
use PHPUnit\Framework\Attributes\CoversNothing;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

use function ob_get_clean;
use function ob_start;
use function trim;

/**
 * Renders the help button of the toolbar with its popover.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
#[CoversNothing]
final class HelpButtonViewTest extends TestCase
{
    /**
     * The button tells assistive technology that it controls the popover and whether that is open,
     * and the popover is a named region with the id that the button points to. The popover starts
     * closed, so the button starts with the state collapsed.
     */
    #[Test]
    public function exposesTheStateOfThePopoverOnTheButton(): void
    {
        $xpath = ViewFixture::xpathOf($this->render());

        $button  = ViewFixture::first($xpath, '//button[contains(concat(" ", @class, " "), " btn-help ")]');
        $popover = ViewFixture::first($xpath, '//div[contains(concat(" ", @class, " "), " help-popover ")]');

        self::assertNotSame('', $button->getAttribute('title'), 'the icon is the only content, so the title names the button');
        self::assertSame('false', $button->getAttribute('aria-expanded'));
        self::assertNotSame('', $popover->getAttribute('id'));
        self::assertSame($popover->getAttribute('id'), $button->getAttribute('aria-controls'));
        self::assertSame('region', $popover->getAttribute('role'));
        self::assertNotSame('', $popover->getAttribute('aria-label'));
        self::assertStringContainsString('d-none', $popover->getAttribute('class'));
    }

    /**
     * The popover lists the interactions of both modes of the chart. The entries of the mode with
     * the default mode start visible, the entries of the mode with the detail panel start hidden, and the
     * page script switches them with the checkbox. The entries for the Tab key, zooming and moving
     * apply to both modes and carry no mode.
     */
    #[Test]
    public function marksTheEntriesOfEachMode(): void
    {
        $xpath = ViewFixture::xpathOf($this->render());

        $default = ViewFixture::elements($xpath, '//tr[@data-help-mode="default"]');
        $panel   = ViewFixture::elements($xpath, '//tr[@data-help-mode="panel"]');
        $both    = ViewFixture::elements($xpath, '//tr[not(@data-help-mode)]');

        self::assertNotSame([], $default);
        self::assertNotSame([], $panel);
        self::assertCount(3, $both, 'moving between the persons, zooming and moving apply to both modes');

        foreach ($default as $row) {
            self::assertStringNotContainsString('d-none', $row->getAttribute('class'));
        }

        foreach ($panel as $row) {
            self::assertStringContainsString('d-none', $row->getAttribute('class'));
        }

        foreach ($both as $row) {
            self::assertStringNotContainsString('d-none', $row->getAttribute('class'));
        }
    }

    /**
     * Each interaction that the issue asks for has its own row in the mode it belongs to. The page
     * without the detail panel has the click on a person, the mode with the panel has the selection
     * of a person and the panel that opens the individual page or centers the chart.
     */
    #[Test]
    public function listsTheInteractionsOfEachMode(): void
    {
        $xpath = ViewFixture::xpathOf($this->render());

        $expected = [
            'default' => ['Click on a person'],
            'panel'   => ['Click or Enter on a person', 'Details panel'],
        ];

        foreach ($expected as $mode => $labels) {
            foreach ($labels as $label) {
                $row = ViewFixture::first(
                    $xpath,
                    '//tr[@data-help-mode="' . $mode . '"][td/strong[normalize-space() = "' . $label . '"]]'
                );

                self::assertNotSame('', trim($row->textContent));
            }
        }
    }

    /**
     * Every row names the interaction and describes what it does, and the rows for zooming and moving
     * are there for both modes. A row with an empty description would show a bare key.
     */
    #[Test]
    public function describesEveryInteractionAndNamesTheZoomAndMoveRows(): void
    {
        $xpath = ViewFixture::xpathOf($this->render());

        $rows = ViewFixture::elements($xpath, '//div[contains(concat(" ", @class, " "), " help-popover ")]//tr');

        self::assertNotSame([], $rows);

        foreach ($rows as $row) {
            self::assertGreaterThan(0, $xpath->evaluate('string-length(normalize-space(td[1]))', $row));
            self::assertGreaterThan(0, $xpath->evaluate('string-length(normalize-space(td[2]))', $row));
        }

        foreach (['Ctrl + scroll', 'Click and drag'] as $label) {
            $row = ViewFixture::first($xpath, '//tr[td/strong[normalize-space() = "' . $label . '"]]');

            self::assertFalse($row->hasAttribute('data-help-mode'));
            self::assertStringNotContainsString('d-none', $row->getAttribute('class'));
        }
    }

    /**
     * The row for the Tab key applies to both modes, because the persons are reached with the keyboard
     * with the detail panel as well as without it.
     */
    #[Test]
    public function sharesTheTabKeyRowBetweenBothModes(): void
    {
        $xpath = ViewFixture::xpathOf($this->render());

        $row = ViewFixture::first($xpath, '//tr[td/strong[normalize-space() = "Tab key"]]');

        self::assertFalse($row->hasAttribute('data-help-mode'));
        self::assertStringNotContainsString('d-none', $row->getAttribute('class'));
    }

    /**
     * The toggle lives in the page script, which also closes the popover on Escape, so the markup
     * carries no inline click handler that would toggle it a second time.
     */
    #[Test]
    public function carriesNoInlineClickHandler(): void
    {
        $xpath = ViewFixture::xpathOf($this->render());

        self::assertSame([], ViewFixture::elements($xpath, '//*[@onclick]'));
    }

    /**
     * Renders the help button.
     */
    private function render(): string
    {
        EnglishLocaleFixture::install();

        ob_start();

        include __DIR__ . '/../../resources/views/modules/components/buttonbar/help-button.phtml';

        $markup = ob_get_clean();

        self::assertIsString($markup);

        return $markup;
    }
}
