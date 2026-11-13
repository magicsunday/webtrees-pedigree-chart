<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Test\Release;

use PHPUnit\Framework\Attributes\CoversNothing;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

use function dirname;
use function file_get_contents;
use function file_put_contents;
use function json_decode;
use function json_encode;
use function mkdir;
use function rmdir;
use function sys_get_temp_dir;
use function tempnam;
use function unlink;

use const JSON_THROW_ON_ERROR;
use const PHP_BINARY;

/**
 * Tests scripts/check-stale-advisory-ignores.php against the output of a real `composer audit --format=json`.
 *
 * The fixture holds one advisory of each package that the module ignores, in the shape that Composer prints for
 * the advisories that match the installed packages.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
#[CoversNothing]
final class StaleAdvisoryIgnoresTest extends TestCase
{
    /**
     * Runs the script without a shell.
     */
    private ProcessRunner $processRunner;

    /**
     * Temporary files that a test created and that tearDown removes again.
     *
     * @var list<string>
     */
    private array $temporaryFiles = [];

    /**
     * Creates the runner of the script.
     */
    protected function setUp(): void
    {
        $this->processRunner = new ProcessRunner();
    }

    /**
     * Removes the temporary files of the test.
     */
    protected function tearDown(): void
    {
        foreach ($this->temporaryFiles as $file) {
            unlink($file);
        }
    }

    /**
     * Every ignored id still matches an installed package, so nothing is reported.
     */
    #[Test]
    public function passesWhenEveryIgnoredAdvisoryStillApplies(): void
    {
        [$status, $output] = $this->check($this->composerJson(), $this->fixture('composer-audit-ignored.json'));

        self::assertSame(0, $status);
        self::assertSame('', $output);
    }

    /**
     * An id that the audit no longer reports as ignored has no match in the installed set and is stale, while the
     * ids that still apply are not named.
     */
    #[Test]
    public function failsAndNamesAnIgnoredAdvisoryThatNoLongerApplies(): void
    {
        $composerJson = $this->composerJson(['PKSA-stale-0000-0000' => 'UPSTREAM-PINNED: no longer affected']);

        [$status, $output] = $this->check($composerJson, $this->fixture('composer-audit-ignored.json'));

        self::assertSame(1, $status);
        self::assertStringContainsString('PKSA-stale-0000-0000', $output);
        self::assertStringNotContainsString('PKSA-gcrk-3vtt-1r14', $output);
    }

    /**
     * Composer leaves the key out of its report when no installed package matches any ignored id. Every ignored id
     * is stale then.
     */
    #[Test]
    public function failsWhenTheAuditReportsNoIgnoredAdvisoryAtAll(): void
    {
        $audit = $this->temporaryFile(json_encode(['advisories' => []], JSON_THROW_ON_ERROR));

        [$status, $output] = $this->check($this->composerJson(), $audit);

        self::assertSame(1, $status);
        self::assertStringContainsString('PKSA-gcrk-3vtt-1r14', $output);
        self::assertStringContainsString('PKSA-z7t6-zt6p-wtng', $output);
    }

    /**
     * Without any ignored id there is nothing that can be stale.
     */
    #[Test]
    public function passesWithoutAnyIgnoredAdvisory(): void
    {
        $composerJson = $this->temporaryFile(json_encode(['name' => 'fixture/module'], JSON_THROW_ON_ERROR));
        $audit        = $this->temporaryFile(json_encode(['advisories' => []], JSON_THROW_ON_ERROR));

        [$status] = $this->check($composerJson, $audit);

        self::assertSame(0, $status);
    }

    /**
     * Composer also accepts a plain list of ids, where the id is the value and not the key.
     */
    #[Test]
    public function readsAnIgnoreListThatHoldsPlainIds(): void
    {
        $ignoreList = ['PKSA-gcrk-3vtt-1r14', 'PKSA-stale-0000-0000'];

        $composerJson = $this->temporaryFile(
            json_encode(
                ['config' => ['policy' => ['advisories' => ['ignore-id' => $ignoreList]]]],
                JSON_THROW_ON_ERROR,
            ),
        );

        [$status, $output] = $this->check($composerJson, $this->fixture('composer-audit-ignored.json'));

        self::assertSame(1, $status);
        self::assertStringContainsString('PKSA-stale-0000-0000', $output);
        self::assertStringNotContainsString('PKSA-gcrk-3vtt-1r14', $output);
    }

    /**
     * A path that does not exist is a failure with status 2 for either input, and the output names the path.
     */
    #[Test]
    public function failsWhenAnInputFileCannotBeRead(): void
    {
        $directory = tempnam(sys_get_temp_dir(), 'stale-ignores-dir-');
        self::assertIsString($directory);

        unlink($directory);
        mkdir($directory);

        $missing = $directory . '/missing.json';

        try {
            [$statusManifest, $outputManifest] = $this->check($missing, $this->fixture('composer-audit-ignored.json'));
            [$statusAudit, $outputAudit]       = $this->check($this->composerJson(), $missing);
        } finally {
            rmdir($directory);
        }

        self::assertSame(2, $statusManifest);
        self::assertStringContainsString('Cannot read ' . $missing, $outputManifest);
        self::assertSame(2, $statusAudit);
        self::assertStringContainsString('Cannot read ' . $missing, $outputAudit);
    }

    /**
     * An audit report that is not JSON, for example the empty file that a crashed audit leaves, is a failure and
     * never a pass.
     */
    #[Test]
    public function failsWhenTheAuditReportIsNotJson(): void
    {
        [$status, $output] = $this->check($this->composerJson(), $this->temporaryFile(''));

        self::assertSame(2, $status);
        self::assertStringContainsString('not valid JSON', $output);
    }

    /**
     * A directory is not a readable file, and the output names it as such, not as invalid JSON.
     */
    #[Test]
    public function failsWhenAnInputPathIsADirectory(): void
    {
        [$status, $output] = $this->check($this->composerJson(), sys_get_temp_dir());

        self::assertSame(2, $status);
        self::assertStringContainsString('Cannot read ' . sys_get_temp_dir(), $output);
    }

    /**
     * A JSON document that holds a scalar and no object or list is a failure, not a pass.
     */
    #[Test]
    public function failsWhenAnInputIsNotAJsonObject(): void
    {
        [$status, $output] = $this->check($this->composerJson(), $this->temporaryFile('"text"'));

        self::assertSame(2, $status);
        self::assertStringContainsString('is not a JSON object', $output);
    }

    /**
     * A key that holds a scalar where the script expects a list or an object counts as absent. The ignore list
     * then holds nothing, and the audit report names no ignored advisory.
     */
    #[Test]
    public function treatsAKeyThatHoldsAScalarAsAbsent(): void
    {
        $manifest = $this->temporaryFile(
            json_encode(
                ['config' => ['policy' => ['advisories' => ['ignore-id' => 'PKSA-gcrk-3vtt-1r14']]]],
                JSON_THROW_ON_ERROR,
            ),
        );
        $audit = $this->temporaryFile(json_encode(['ignored-advisories' => 'text'], JSON_THROW_ON_ERROR));

        [$statusManifest] = $this->check($manifest, $this->fixture('composer-audit-ignored.json'));
        [$statusAudit]    = $this->check($this->composerJson(), $audit);

        self::assertSame(0, $statusManifest);
        self::assertSame(1, $statusAudit);
    }

    /**
     * A package entry or an advisory entry of the audit report that does not have the expected shape is skipped
     * without a PHP warning, and the entries of the proper shape still count.
     */
    #[Test]
    public function skipsAuditEntriesThatLackTheExpectedShape(): void
    {
        $audit = $this->temporaryFile(
            json_encode(
                [
                    'ignored-advisories' => [
                        'vendor/scalar'    => 'text',
                        'vendor/shapeless' => [['title' => 'no advisory id'], 'text'],
                        'vendor/numeric'   => [['advisoryId' => 5]],
                        'vendor/proper'    => [['advisoryId' => 'PKSA-gcrk-3vtt-1r14']],
                    ],
                ],
                JSON_THROW_ON_ERROR,
            ),
        );

        $manifest = $this->temporaryFile(
            json_encode(
                ['config' => ['policy' => ['advisories' => ['ignore-id' => ['PKSA-gcrk-3vtt-1r14' => 'reason']]]]],
                JSON_THROW_ON_ERROR,
            ),
        );

        [$status, $output] = $this->check($manifest, $audit);

        self::assertSame(0, $status);
        self::assertSame('', $output);
    }

    /**
     * Builds a composer.json that ignores the advisories of the fixture, plus the given extra ids.
     *
     * @param array<string, string> $extraIds
     */
    private function composerJson(array $extraIds = []): string
    {
        $contents = file_get_contents(__DIR__ . '/Fixture/composer-ignoring.json');
        self::assertIsString($contents);

        /** @var array{config: array{policy: array{advisories: array{'ignore-id': array<string, string>}}}} $manifest */
        $manifest = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);

        foreach ($extraIds as $id => $reason) {
            $manifest['config']['policy']['advisories']['ignore-id'][$id] = $reason;
        }

        return $this->temporaryFile(json_encode($manifest, JSON_THROW_ON_ERROR));
    }

    /**
     * Returns the path of a fixture file next to this test.
     */
    private function fixture(string $name): string
    {
        return __DIR__ . '/Fixture/' . $name;
    }

    /**
     * Writes the contents to a new temporary file and returns its path.
     */
    private function temporaryFile(string $contents): string
    {
        $path = tempnam(sys_get_temp_dir(), 'stale-ignores-');
        self::assertIsString($path);

        file_put_contents($path, $contents);

        $this->temporaryFiles[] = $path;

        return $path;
    }

    /**
     * Runs the script and returns its exit status and its combined output.
     *
     * @return array{int, string}
     */
    private function check(string $composerJson, string $audit): array
    {
        $root = dirname(__DIR__, 2);

        return $this->processRunner->execute(
            [PHP_BINARY, '-d', 'display_errors=stderr', '-d', 'error_reporting=-1', $root . '/scripts/check-stale-advisory-ignores.php', $composerJson, $audit],
            $root,
        );
    }
}
