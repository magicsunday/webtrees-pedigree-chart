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
 * @typedef {Object} Data
 * @property {Number}   id              The unique ID of the person
 * @property {String}   xref            The unique identifier of the person
 * @property {String}   sex             The sex of the person
 * @property {String}   birth           The birthdate of the person
 * @property {String}   death           The death date of the person
 * @property {String}   timespan        The lifetime description
 * @property {String}   thumbnail       The URL of the thumbnail image
 * @property {String}   name            The full name of the individual
 * @property {String}   preferredName   The preferred first name
 * @property {String[]} firstNames      The list of first names
 * @property {String[]} lastNames       The list of last names
 * @property {String}   alternativeName The alternative name of the individual
 * @property {String[]} additionalTags  A list of additional tags to output
 */

/**
 * A person object.
 *
 * @typedef {Object} Person
 * @property {null|Data}          data     The data object of the individual
 * @property {undefined|Object[]} parents  The list of the parents of this individual
 */

/**
 * An individual. Extends the D3 Node object.
 *
 * @typedef {Node} Individual
 * @property {Person}       data     The individual data
 * @property {Individual[]} children The children of the node
 * @property {Number}       x        The X-coordinate of the node
 * @property {Number}       y        The Y-coordinate of the node
 */

/**
 * An X/Y coordinate.
 *
 * @typedef {Object} Coordinate
 * @property {Number} x The X-coordinate
 * @property {Number} y The Y-coordinate
 */

/**
 * A link between two nodes.
 *
 * @typedef {Object} Link
 * @property {Individual} source The source individual
 * @property {Individual} target The target individual
 */

/**
 * @typedef {Object} NameElementData
 * @property {Data}    data
 * @property {Boolean} isRtl
 * @property {Boolean} isAltRtl
 * @property {Boolean} withImage
 */

/**
 * @typedef {Object} LabelElementData
 * @property {String}  label
 * @property {Boolean} isPreferred
 * @property {Boolean} isLastName
 * @property {Boolean} isNameRtl
 */