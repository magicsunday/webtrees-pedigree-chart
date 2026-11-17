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
use function escapeshellarg;
use function file_get_contents;
use function file_put_contents;
use function is_dir;
use function is_file;
use function json_decode;
use function mkdir;
use function rmdir;
use function str_contains;
use function str_replace;
use function sys_get_temp_dir;
use function tempnam;
use function unlink;

use const JSON_THROW_ON_ERROR;
use const PHP_BINARY;

/**
 * Tests the wiring of the composer script ci:test:php:advisories by running its audit step from composer.json with
 * a stand-in for the audit command that reports a finding through its exit status, as the real one does.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
#[CoversNothing]
final class AdvisoriesScriptWiringTest extends TestCase
{
    /**
     * The audit command as the script spells it.
     */
    private const string AUDIT_COMMAND = '@composer audit --format=json';

    /**
     * The scratch directory the audit step runs in.
     */
    private string $workingDirectory = '';

    /**
     * The stand-in for the audit command.
     */
    private string $stub = '';

    /**
     * Creates a scratch directory with the build directory the script writes into.
     */
    protected function setUp(): void
    {
        $directory = tempnam(sys_get_temp_dir(), 'advisories-wiring-');
        self::assertIsString($directory);
        unlink($directory);
        mkdir($directory . '/.build', 0o777, true);

        $this->workingDirectory = $directory;
        $this->stub             = $directory . '/audit-stub.php';

        file_put_contents($this->stub, "<?php\necho '{\"advisories\":[]}';\nexit(1);\n");
    }

    /**
     * Removes the scratch directory.
     */
    protected function tearDown(): void
    {
        foreach ([$this->stub, $this->workingDirectory . '/.build/composer-audit.json'] as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }

        if (is_dir($this->workingDirectory . '/.build')) {
            rmdir($this->workingDirectory . '/.build');
        }

        rmdir($this->workingDirectory);
    }

    /**
     * An audit that exits with a failure status does not fail the script, and its report is written to the file
     * that the stale-ignore check reads next.
     */
    #[Test]
    public function auditStepKeepsTheReportAndToleratesTheFailureStatus(): void
    {
        $scripts = $this->advisoryScripts();
        $audit   = $scripts[0];

        self::assertStringStartsWith(self::AUDIT_COMMAND, $audit);

        $command = str_replace(self::AUDIT_COMMAND, escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($this->stub), $audit);

        [$status] = (new ProcessRunner())->execute(['/bin/sh', '-c', $command], $this->workingDirectory);

        self::assertSame(0, $status);

        $report = $this->workingDirectory . '/.build/composer-audit.json';

        self::assertFileExists($report);
        self::assertSame('{"advisories":[]}', file_get_contents($report));
        self::assertTrue(str_contains($scripts[1], '.build/composer-audit.json'));
    }

    /**
     * Returns the audit command and the stale-ignore check of the composer script.
     *
     * @return array{string, string}
     */
    private function advisoryScripts(): array
    {
        $contents = file_get_contents(dirname(__DIR__, 2) . '/composer.json');
        self::assertIsString($contents);

        /** @var array{scripts: array{'ci:test:php:advisories': array{string, string}}} $manifest */
        $manifest = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);

        $scripts = $manifest['scripts']['ci:test:php:advisories'];

        self::assertCount(2, $scripts);

        return [$scripts[0], $scripts[1]];
    }
}
