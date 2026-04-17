<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Test\Module;

use MagicSunday\Webtrees\PedigreeChart\Module;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * Smoke test confirming the module class loads and exposes its custom metadata
 * constants. Serves as the seed for the wider test suite — add focused tests
 * alongside new classes rather than expanding this file.
 */
#[CoversClass(Module::class)]
final class ModuleTest extends TestCase
{
    #[Test]
    public function customVersionIsNonEmptySemverString(): void
    {
        self::assertMatchesRegularExpression('/^\d+\.\d+\.\d+(-dev)?$/', Module::CUSTOM_VERSION);
    }

    #[Test]
    public function customAuthorAndSupportUrlExposed(): void
    {
        self::assertNotSame('', Module::CUSTOM_AUTHOR);
        self::assertStringStartsWith('https://', Module::CUSTOM_SUPPORT_URL);
    }
}
