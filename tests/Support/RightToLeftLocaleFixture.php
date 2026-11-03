<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Test\Support;

use Fisharebest\Localization\Locale;
use Fisharebest\Webtrees\I18N;
use MagicSunday\Webtrees\ModuleBase\Testing\EnglishLocaleFixture;
use ReflectionProperty;

/**
 * Switches the locale of the webtrees core to a language that is written from right to left, while
 * the translations stay the ones of the given catalogue.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
final class RightToLeftLocaleFixture
{
    /**
     * Private constructor, the class only offers static methods.
     */
    private function __construct()
    {
    }

    /**
     * Installs the given translations and makes the writing direction of the locale right to left.
     *
     * @param array<string, string> $messages The translations by source text
     */
    public static function install(array $messages = []): void
    {
        EnglishLocaleFixture::install($messages);

        $localeProperty = new ReflectionProperty(I18N::class, 'locale');
        $localeProperty->setValue(null, Locale::create('ar'));
    }
}
