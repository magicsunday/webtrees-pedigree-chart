/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file distributed with this source code.
 */

import {Node} from "../lib/d3";

/**
 * This files defines the internal used structures of objects.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */

/**
 * The plain person data.
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
 * @property {string}   alternativeName The alternative name of the individual
 */

/**
 * A person object.
 *
 * @typedef {object} Person
 * @property {null|Data}          data     The data object of the individual
 * @property {undefined|object[]} parents  The list of the parents of this individual
 */

/**
 * An individual. Extends the D3 Node object.
 *
 * @typedef {Node} Individual
 * @property {Person}       data     The individual data
 * @property {Individual[]} children The children of the node
 * @property {number}       x        The X-coordinate of the node
 * @property {number}       y        The Y-coordinate of the node
 */

/**
 * An X/Y coordinate.
 *
 * @typedef {object} Coordinate
 * @property {number} x The X-coordinate
 * @property {number} y The Y-coordinate
 */

/**
 * A link between two nodes.
 *
 * @typedef {object} Link
 * @property {Individual} source The source individual
 * @property {Individual} target The target individual
 */

/**
 * @typedef {object} NameElementData
 * @property {Data}    data
 * @property {boolean} isRtl
 * @property {boolean} isAltRtl
 * @property {boolean} withImage
 */

/**
 * @typedef {object} LabelElementData
 * @property {string}  label
 * @property {boolean} isPreferred
 * @property {boolean} isLastName
 * @property {boolean} isNameRtl
 */
