<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Test\Facade;

use Fig\Http\Message\RequestMethodInterface;
use Fisharebest\Webtrees\Auth;
use Fisharebest\Webtrees\Contracts\UserInterface;
use Fisharebest\Webtrees\DB;
use Fisharebest\Webtrees\Factories\CacheFactory;
use Fisharebest\Webtrees\Individual;
use Fisharebest\Webtrees\Registry;
use Fisharebest\Webtrees\Services\ChartService;
use Fisharebest\Webtrees\Services\UserService;
use Fisharebest\Webtrees\Session;
use Fisharebest\Webtrees\Site;
use Fisharebest\Webtrees\Tree;
use GuzzleHttp\Psr7\ServerRequest;
use MagicSunday\Webtrees\ModuleBase\Testing\RealTreeFixture;
use MagicSunday\Webtrees\PedigreeChart\Configuration;
use MagicSunday\Webtrees\PedigreeChart\Facade\DataFacade;
use MagicSunday\Webtrees\PedigreeChart\Model\Node;
use MagicSunday\Webtrees\PedigreeChart\Module;
use MagicSunday\Webtrees\PedigreeChart\Test\Support\PayloadToken;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\UsesClass;
use PHPUnit\Framework\TestCase;
use RuntimeException;

use function file_get_contents;
use function file_put_contents;
use function is_dir;
use function is_file;
use function json_decode;
use function json_encode;
use function mkdir;
use function rmdir;
use function sys_get_temp_dir;
use function uniqid;
use function unlink;

use const JSON_THROW_ON_ERROR;
use const JSON_UNESCAPED_UNICODE;

/**
 * Drives the real webtrees privacy engine through the data path of the chart. The tree is a real
 * imported GEDCOM in a real schema, and the node tree comes from the facade the chart uses, so
 * nothing about the visibility of a person is stubbed.
 *
 * The tree holds a deceased public line, the deceased confidential people, among them a person
 * without dates, and a living person with a place, an alternative name, a marriage and a
 * highlighted image. The confidential people and the living person are the private ones. A visitor
 * may not see any of them. A member who is no editor sees the living person but not the
 * confidential people, because that restriction is for managers. The importing administrator sees
 * all of them. The names of private people are shown to managers only, the tree setting that lets
 * members see them is a choice of the tree and not of the chart. The alternative names are written
 * in another script, because webtrees offers an alternative name only for such a name.
 *
 * The living person stays living only while its birth lies within the maximum age of a living
 * person of the tree, so this fixture needs a later birth year once that age has passed.
 *
 * The test reads the administrator result first, so the data of the private people is shown to be
 * in the fixture and in the payload, and it only then drops to a lower viewer, so that the absence
 * of the data is the gate and not an empty fixture. A positive control keeps the assertions on the
 * result of the lower viewers from passing on an empty chart.
 *
 * A private person stays in the chart as a stub, as it does in the core charts. The stub holds
 * the existence of the person, its xref, its sex and its position in the tree, and nothing else.
 * The name of the stub is the "Private" placeholder, and the dates, image and facts are empty.
 * A guessed xref of a private person therefore yields the same stub, which is what the chart box
 * of the core charts shows for such a person.
 *
 * The webtrees record factory caches the records of a request, and a cached record keeps the
 * names it extracted for the first viewer. A request has a single viewer, so the test clears that
 * cache whenever the viewer changes.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
#[CoversClass(DataFacade::class)]
#[UsesClass(Configuration::class)]
#[UsesClass(Module::class)]
#[UsesClass(Node::class)]
final class DataFacadePrivacyTest extends TestCase
{
    /**
     * Values that exist only on the confidential deceased people (I3, and I6 who has no dates), the
     * living grandfather (I4) and the marriage records that list them. Each is shown to the
     * administrator and must not reach a visitor.
     *
     * @var list<string>
     */
    private const array PRIVATE_TOKENS = [
        'Motherly',
        'Confidentialmother',
        'Мать',
        'Скрытаямать',
        'Hiddenmotherplace',
        '1877',
        '1951',
        'Grandy',
        'Livingfather',
        'Отец',
        'Скрытыйотец',
        'Hiddenlivingplace',
        '1931',
        'Hiddenmarriageplace',
        '1896',
        'Hiddenlivingmarriageplace',
        '1953',
        'Deadone',
        'Hiddendeadnodates',
        'Deceased',
    ];

    /**
     * Values of the public deceased people, which every viewer sees.
     *
     * @var list<string>
     */
    private const array PUBLIC_TOKENS = [
        'Rootline',
        'Publicroot',
        'Rootbirthplace',
        'Rootdeathplace',
        '1900',
        '1975',
        'Fatherly',
        'Publicfather',
        'Fatherbirthplace',
        '1870',
        '1940',
        'Grandma',
        'Publicgrandmother',
        'Grandmabirthplace',
        '1845',
        '1910',
    ];

    /**
     * The files of the media objects of the fixture. The first belongs to the living person, the
     * second is shared by a public and a confidential person, and the third belongs to a public
     * person alone.
     *
     * @var list<string>
     */
    private const array MEDIA_FILES = ['hiddenlivingphoto.jpg', 'sharedphoto.jpg', 'publicphoto.jpg'];

    /**
     * The module of the chart, which the facade reads its settings and its routes from.
     */
    private Module $module;

    /**
     * The index directory that holds the media files of the fixture, or an empty string while the
     * test has none.
     */
    private string $indexDirectory = '';

    /**
     * Boots webtrees, builds a fresh schema in memory and logs in an administrator, the way the
     * import of a tree runs in production.
     */
    protected function setUp(): void
    {
        parent::setUp();

        RealTreeFixture::boot();

        // The media files of the fixture have to exist, because the image of a person is only
        // referenced when its file is there.
        $indexDirectory = sys_get_temp_dir() . '/pedigree-chart-privacy-' . uniqid('', true) . '/';

        if (
            !mkdir($indexDirectory . 'media', 0o777, true)
            && !is_dir($indexDirectory . 'media')
        ) {
            throw new RuntimeException('The media directory could not be created.');
        }

        $this->indexDirectory = $indexDirectory;

        foreach (self::MEDIA_FILES as $file) {
            file_put_contents($this->indexDirectory . 'media/' . $file, 'image');
        }

        Site::setPreference('INDEX_DIRECTORY', $this->indexDirectory);

        DB::table('module')->insert(['module_name' => 'webtrees-pedigree-chart']);

        $this->module = new Module(self::createStub(ChartService::class), new DataFacade());
        $this->module->setName('webtrees-pedigree-chart');
        $this->module->boot();
    }

    /**
     * Drops the viewer and the media directory of the test.
     */
    protected function tearDown(): void
    {
        Auth::logout();
        Session::clear();
        Site::$preferences = [];
        Registry::cache(new CacheFactory());

        foreach (self::MEDIA_FILES as $file) {
            if (is_file($this->indexDirectory . 'media/' . $file)) {
                unlink($this->indexDirectory . 'media/' . $file);
            }
        }

        if (is_dir($this->indexDirectory . 'media')) {
            rmdir($this->indexDirectory . 'media');
        }

        if (is_dir($this->indexDirectory)) {
            rmdir($this->indexDirectory);
        }

        RealTreeFixture::restoreMinimalDatabase();

        parent::tearDown();
    }

    /**
     * The administrator control. Every private value is in the payload of the importing
     * administrator, and so is the public data, so the tests of the other viewers measure the gate.
     */
    #[Test]
    public function administratorPayloadHoldsTheDataOfThePrivatePeople(): void
    {
        $tree = $this->importTree();

        $payload = $this->payload($tree, 'I1');

        foreach ([...self::PRIVATE_TOKENS, ...self::PUBLIC_TOKENS] as $token) {
            PayloadToken::assertPresent($this, $token, $payload, 'The administrator should see ' . $token);
        }
    }

    /**
     * A visitor gets no name, date, place, image reference or fact of a private person, from the
     * ancestors of a public person, and the public deceased people are still there.
     */
    #[Test]
    public function visitorPayloadHoldsNothingOfThePrivatePeople(): void
    {
        $tree = $this->importTree();

        // The control runs as the administrator and fills the record cache with the administrator view.
        self::assertStringContainsString('Livingfather', $this->payload($tree, 'I1'));

        $this->asVisitor();

        $payload = $this->payload($tree, 'I1');

        foreach (self::PUBLIC_TOKENS as $token) {
            PayloadToken::assertPresent($this, $token, $payload, 'The visitor should see ' . $token);
        }

        foreach (self::PRIVATE_TOKENS as $token) {
            PayloadToken::assertAbsent($this, $token, $payload, 'The visitor must not see ' . $token);
        }
    }

    /**
     * A member who is no editor sees the living person and the public people, but not the
     * confidential people, whose restriction is meant for managers.
     */
    #[Test]
    public function memberPayloadHoldsNothingOfTheConfidentialPeople(): void
    {
        $tree = $this->importTree();

        self::assertStringContainsString('Confidentialmother', $this->payload($tree, 'I1'));

        $this->asMember($tree);

        $payload = $this->payload($tree, 'I1');

        foreach (self::PUBLIC_TOKENS as $token) {
            PayloadToken::assertPresent($this, $token, $payload, 'The member should see ' . $token);
        }

        foreach (['Motherly', 'Confidentialmother', 'Мать', 'Скрытаямать', 'Hiddenmotherplace', '1877', '1951', 'Hiddenmarriageplace', '1896', 'Deadone', 'Hiddendeadnodates', 'Deceased'] as $token) {
            PayloadToken::assertAbsent($this, $token, $payload, 'The member must not see ' . $token);
        }

        foreach (['Grandy', 'Livingfather', 'Отец', 'Скрытыйотец', 'Hiddenlivingplace', '1931', 'Hiddenlivingmarriageplace', '1953'] as $token) {
            PayloadToken::assertPresent($this, $token, $payload, 'The member should see ' . $token);
        }
    }

    /**
     * A chart centred on a guessed private xref shows the stub of the core charts, which is the
     * existence of the person, its xref, its sex and its position, and nothing more.
     */
    #[Test]
    public function guessedPrivateXrefYieldsTheCoreCompatibleStub(): void
    {
        $tree = $this->importTree();

        self::assertStringContainsString('Confidentialmother', $this->payload($tree, 'I3'));
        self::assertStringContainsString('Deceased', $this->dataField($tree, 'I6', 'timespan'));

        $this->asVisitor();

        $stub = $this->payload($tree, 'I3');

        self::assertSame('I3', $this->dataField($tree, 'I3', 'xref'));
        self::assertSame('F', $this->dataField($tree, 'I3', 'sex'));
        self::assertSame('Private', $this->dataField($tree, 'I3', 'name'));
        self::assertStringContainsString('"generation":1', $stub);

        foreach (['alternativeName', 'birth', 'death', 'timespan', 'thumbnail', 'silhouette'] as $field) {
            self::assertSame('', $this->dataField($tree, 'I3', $field), $field . ' of the stub should be empty');
        }

        self::assertStringContainsString('"facts":[null,null]', $stub);

        // A confidential person without dates shows no deceased label either.
        self::assertSame('', $this->dataField($tree, 'I6', 'timespan'));

        foreach (self::PRIVATE_TOKENS as $token) {
            PayloadToken::assertAbsent($this, $token, $stub, 'The stub must not carry ' . $token);
        }
    }

    /**
     * A visitor gets no thumbnail for the living person, and none for a public person whose media
     * object is also linked to a confidential person, because the privacy engine hides a media object
     * when any record it is linked to is hidden. A public person with a media object of its own keeps
     * its thumbnail, and the administrator sees each of them.
     */
    #[Test]
    public function visitorGetsNoThumbnailForMediaOfAPrivatePerson(): void
    {
        $tree = $this->importTree();

        // The control runs as the administrator, who sees the thumbnail of every person that has one.
        foreach (['I4', 'I2', 'I5'] as $xref) {
            self::assertStringContainsString('media-thumbnail', $this->dataField($tree, $xref, 'thumbnail'), $xref);
        }

        $this->asVisitor();

        // The living person has no thumbnail, and neither has the public person whose media object
        // is shared with a confidential person, while the public person with an own media object
        // keeps its thumbnail.
        self::assertStringNotContainsString('media-thumbnail', $this->dataField($tree, 'I4', 'thumbnail'), 'The living person has no thumbnail.');
        self::assertStringNotContainsString('media-thumbnail', $this->dataField($tree, 'I2', 'thumbnail'), 'The shared media object is hidden.');
        self::assertStringContainsString('media-thumbnail', $this->dataField($tree, 'I5', 'thumbnail'));
    }

    /**
     * The silhouette URL is the only carrier of the placeholder image once the tree preference for
     * silhouettes is on. A visitor gets none for a person that the privacy engine hides, whereas a
     * person that the visitor may see gets one.
     */
    #[Test]
    public function visitorGetsNoSilhouetteUrlForAPrivatePersonWhenSilhouettesAreOn(): void
    {
        $tree = $this->importTree();

        $tree->setPreference('USE_SILHOUETTE', '1');

        // The control runs as the administrator, who sees the private person with a silhouette.
        self::assertNotSame('', $this->dataField($tree, 'I3', 'silhouette'));

        $this->asVisitor();

        self::assertSame('', $this->dataField($tree, 'I3', 'silhouette'));
        self::assertNotSame('', $this->dataField($tree, 'I1', 'silhouette'));
    }

    /**
     * Returns a text field of the data of the centre person of the chart as the current viewer.
     *
     * @param Tree   $tree  The imported tree
     * @param string $xref  The xref of the centre of the chart
     * @param string $field The key of the field in the data of the person
     */
    private function dataField(Tree $tree, string $xref, string $field): string
    {
        $decoded = json_decode($this->payload($tree, $xref), true, 512, JSON_THROW_ON_ERROR);
        self::assertIsArray($decoded);

        $data = $decoded['data'] ?? null;
        self::assertIsArray($data);

        $value = $data[$field] ?? null;
        self::assertIsString($value);

        return $value;
    }

    /**
     * Switches the viewer to a visitor and drops the records that the administrator view cached.
     */
    private function asVisitor(): void
    {
        Registry::cache(new CacheFactory());
        Auth::logout();
    }

    /**
     * Switches the viewer to a member of the tree who is no editor and drops the records that the
     * administrator view cached.
     *
     * @param Tree $tree The imported tree
     */
    private function asMember(Tree $tree): void
    {
        Registry::cache(new CacheFactory());

        $member = (new UserService())->create('member', 'Member', 'member@example.test', 'secret');
        $tree->setUserPreference($member, UserInterface::PREF_TREE_ROLE, UserInterface::ROLE_MEMBER);

        Auth::logout();
        Auth::login($member);
    }

    /**
     * Returns the JSON payload of the chart as the current viewer.
     *
     * @param Tree   $tree The imported tree
     * @param string $xref The xref of the centre of the chart
     */
    private function payload(Tree $tree, string $xref): string
    {
        return json_encode($this->nodeTree($tree, $xref), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    }

    /**
     * Builds the node tree with the detail panel facts and the images on, so that every kind of
     * data the chart carries is in the payload.
     *
     * @param Tree   $tree The imported tree
     * @param string $xref The xref of the centre of the chart
     */
    private function nodeTree(Tree $tree, string $xref): Node
    {
        $individual = Registry::individualFactory()->make($xref, $tree);
        self::assertInstanceOf(Individual::class, $individual);

        $configuration = new Configuration(
            (new ServerRequest(RequestMethodInterface::METHOD_GET, '/'))->withQueryParams([
                'generations'     => '4',
                'showDetailPanel' => '1',
            ]),
            $this->module
        );

        $node = (new DataFacade())
            ->setModule($this->module)
            ->setConfiguration($configuration)
            ->setRoute('webtrees-pedigree-chart')
            ->createTreeStructure($individual);

        self::assertInstanceOf(Node::class, $node);

        return $node;
    }

    /**
     * Imports the fixture tree as the administrator and turns the privacy engine on. Living people
     * are hidden from visitors and the dead are public, so a visitor sees a person only when the
     * person is dead and not restricted. The relationships of private people stay in the chart, so
     * that a private person is a stub in it and the family and marriage records that list the
     * person are checked as well. The other preferences have these values by default and are
     * pinned because the assertions depend on them. The preference for the names of private people is
     * set to managers, see the class docblock.
     */
    private function importTree(): Tree
    {
        $tree = RealTreeFixture::importGedcom((string) file_get_contents(__DIR__ . '/../Support/fixtures/privacy-ancestry.ged'), 'privacy');

        $tree->setPreference('HIDE_LIVE_PEOPLE', '1');
        $tree->setPreference('SHOW_LIVING_NAMES', (string) Auth::PRIV_NONE);
        $tree->setPreference('SHOW_DEAD_PEOPLE', (string) Auth::PRIV_PRIVATE);
        $tree->setPreference('SHOW_HIGHLIGHT_IMAGES', '1');
        $tree->setPreference('SHOW_PRIVATE_RELATIONSHIPS', '1');

        return $tree;
    }
}
