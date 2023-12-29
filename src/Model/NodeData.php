<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information; please read the
 * LICENSE file distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Model;

use Fisharebest\Webtrees\Individual;
use JsonSerializable;

/**
 * This class holds the data required to render and display the tree.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
class NodeData implements JsonSerializable
{
    /**
     * The unique ID of the individual.
     *
     * @var int
     */
    protected int $id = 0;

    /**
     * The XREF of the individual.
     *
     * @var string
     */
    protected string $xref = '';

    /**
     * The URL to this individual in webtrees.
     *
     * @var string
     */
    protected string $url = '';

    /**
     * The URL used to update the clicked entry in the tree with this individual.
     *
     * @var string
     */
    protected string $updateUrl = '';

    /**
     * The generation the individual belongs to.
     *
     * @var int
     */
    protected int $generation = 0;

    /**
     * The full name of the individual.
     *
     * @var string
     */
    protected string $name = '';

    /**
     * TRUE if the name is written right to left.
     *
     * @var bool
     */
    protected bool $isNameRtl = false;

    /**
     * The list of first names.
     *
     * @var string[]
     */
    protected array $firstNames = [];

    /**
     * The list of last names.
     *
     * @var string[]
     */
    protected array $lastNames = [];

    /**
     * The extracted preferred name.
     *
     * @var string
     */
    protected string $preferredName = '';

    /**
     * The alternative name.
     *
     * @var string
     */
    protected string $alternativeName = '';

    /**
     * TRUE if the alternative name is written right to left.
     *
     * @var bool
     */
    protected bool $isAltRtl = false;

    /**
     * The URL of the individuals highlight image.
     *
     * @var string
     */
    protected string $thumbnail = '';

    /**
     * The sex of the individual.
     *
     * @var string
     */
    protected string $sex = 'U';

    /**
     * The formatted birthdate without HTML tags.
     *
     * @var string
     */
    protected string $birth = '';

    /**
     * The formatted death date without HTML tags.
     *
     * @var string
     */
    protected string $death = '';

    /**
     * The timespan label.
     *
     * @var string
     */
    protected string $timespan = '';

    /**
     * The age of the father at birth of a child.
     *
     * @var string
     */
    protected string $fatherAge = '';

    /**
     * The age of the mother at birth of a child.
     *
     * @var string
     */
    protected string $motherAge = '';

    /**
     * The underlying individual instance. Only used internally.
     *
     * @var null|Individual
     */
    protected ?Individual $individual = null;

    /**
     * @return int
     */
    public function getId(): int
    {
        return $this->id;
    }

    /**
     * @param int $id
     *
     * @return NodeData
     */
    public function setId(int $id): NodeData
    {
        $this->id = $id;
        return $this;
    }

    /**
     * @param string $xref
     *
     * @return NodeData
     */
    public function setXref(string $xref): NodeData
    {
        $this->xref = $xref;
        return $this;
    }

    /**
     * @param string $url
     *
     * @return NodeData
     */
    public function setUrl(string $url): NodeData
    {
        $this->url = $url;
        return $this;
    }

    /**
     * @param string $updateUrl
     *
     * @return NodeData
     */
    public function setUpdateUrl(string $updateUrl): NodeData
    {
        $this->updateUrl = $updateUrl;
        return $this;
    }

    /**
     * @param int $generation
     *
     * @return NodeData
     */
    public function setGeneration(int $generation): NodeData
    {
        $this->generation = $generation;
        return $this;
    }

    /**
     * @return string
     */
    public function getName(): string
    {
        return $this->name;
    }

    /**
     * @param string $name
     *
     * @return NodeData
     */
    public function setName(string $name): NodeData
    {
        $this->name = $name;
        return $this;
    }

    /**
     * @param bool $isNameRtl
     *
     * @return NodeData
     */
    public function setIsNameRtl(bool $isNameRtl): NodeData
    {
        $this->isNameRtl = $isNameRtl;
        return $this;
    }

    /**
     * @param string[] $firstNames
     *
     * @return NodeData
     */
    public function setFirstNames(array $firstNames): NodeData
    {
        $this->firstNames = $firstNames;
        return $this;
    }

    /**
     * @param string[] $lastNames
     *
     * @return NodeData
     */
    public function setLastNames(array $lastNames): NodeData
    {
        $this->lastNames = $lastNames;
        return $this;
    }

    /**
     * @param string $preferredName
     *
     * @return NodeData
     */
    public function setPreferredName(string $preferredName): NodeData
    {
        $this->preferredName = $preferredName;
        return $this;
    }

    /**
     * @param string $alternativeName
     *
     * @return NodeData
     */
    public function setAlternativeName(string $alternativeName): NodeData
    {
        $this->alternativeName = $alternativeName;
        return $this;
    }

    /**
     * @param bool $isAltRtl
     *
     * @return NodeData
     */
    public function setIsAltRtl(bool $isAltRtl): NodeData
    {
        $this->isAltRtl = $isAltRtl;
        return $this;
    }

    /**
     * @param string $thumbnail
     *
     * @return NodeData
     */
    public function setThumbnail(string $thumbnail): NodeData
    {
        $this->thumbnail = $thumbnail;
        return $this;
    }

    /**
     * @param string $sex
     *
     * @return NodeData
     */
    public function setSex(string $sex): NodeData
    {
        $this->sex = $sex;
        return $this;
    }

    /**
     * @param string $birth
     *
     * @return NodeData
     */
    public function setBirth(string $birth): NodeData
    {
        $this->birth = $birth;
        return $this;
    }

    /**
     * @param string $death
     *
     * @return NodeData
     */
    public function setDeath(string $death): NodeData
    {
        $this->death = $death;
        return $this;
    }

    /**
     * @param string $timespan
     *
     * @return NodeData
     */
    public function setTimespan(string $timespan): NodeData
    {
        $this->timespan = $timespan;
        return $this;
    }

    /**
     * @param string $fatherAge
     *
     * @return NodeData
     */
    public function setFatherAge(string $fatherAge): NodeData
    {
        $this->fatherAge = $fatherAge;
        return $this;
    }

    /**
     * @param string $motherAge
     *
     * @return NodeData
     */
    public function setMotherAge(string $motherAge): NodeData
    {
        $this->motherAge = $motherAge;
        return $this;
    }

    /**
     * @return null|Individual
     */
    public function getIndividual(): ?Individual
    {
        return $this->individual;
    }

    /**
     * @param null|Individual $individual
     *
     * @return NodeData
     */
    public function setIndividual(?Individual $individual): NodeData
    {
        $this->individual = $individual;
        return $this;
    }

    /**
     * Returns the relevant data as an array.
     *
     * @return array<string, int|bool|string|string[]>
     */
    public function jsonSerialize(): array
    {
        return [
            'id'              => $this->id,
            'xref'            => $this->xref,
            'url'             => $this->url,
            'updateUrl'       => $this->updateUrl,
            'generation'      => $this->generation,
            'name'            => $this->name,
            'isNameRtl'       => $this->isNameRtl,
            'firstNames'      => $this->firstNames,
            'lastNames'       => $this->lastNames,
            'preferredName'   => $this->preferredName,
            'alternativeName' => $this->alternativeName,
            'isAltRtl'        => $this->isAltRtl,
            'thumbnail'       => $this->thumbnail,
            'sex'             => $this->sex,
            'birth'           => $this->birth,
            'death'           => $this->death,
            'timespan'        => $this->timespan,
            'fatherAge'       => $this->fatherAge,
            'motherAge'       => $this->motherAge,
        ];
    }
}
