/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

/**
 * This files defines the internal used structures of objects.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */

/**
 * The plain person data emitted by the PHP DataFacade.
 *
 * @typedef {object} Data
 * @property {number}   id              The unique ID of the person
 * @property {string}   xref            The unique identifier of the person
 * @property {string}   sex             The sex of the person
 * @property {string}   birth           The birthdate of the person
 * @property {string}   death           The death date of the person
 * @property {string}   timespan        The lifetime description
 * @property {string}   thumbnail       The URL of the thumbnail image
 * @property {string}   name            The full name of the individual
 * @property {string}   preferredName   The preferred first name
 * @property {string[]} firstNames      The list of first names
 * @property {string[]} lastNames       The list of last names
 * @property {string}   nickname        Quoted nickname inserted between given names and surname
 * @property {string}   alternativeName The alternative name of the individual
 * @property {boolean}  isNameRtl       Whether the primary name should render right-to-left
 * @property {boolean}  isAltRtl        Whether the alternative name should render right-to-left
 */

/**
 * @typedef {object} NameElementData
 * @property {{data: Data}} data
 * @property {boolean} [isRtl]
 * @property {boolean} [isAltRtl]
 * @property {boolean} [withImage]
 */

/**
 * @typedef {object} LabelElementData
 * @property {string}  label
 * @property {boolean} isPreferred
 * @property {boolean} isLastName
 * @property {boolean} isNameRtl
 */
