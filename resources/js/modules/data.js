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
 * The plain person data emitted by the PHP DataFacade. Field set mirrors
 * NodeData::jsonSerialize() so any property added on the PHP side must also be
 * added here for the strict typecheck pass to keep surfacing typos.
 *
 * @typedef {object} Data
 * @property {number}   id              The unique ID of the person
 * @property {string}   xref            The unique identifier of the person
 * @property {string}   url             Link to the individual's webtrees page
 * @property {string}   updateUrl       AJAX endpoint used to re-center the chart on this person
 * @property {number}   generation      The generation the person belongs to (1 = subject)
 * @property {string}   sex             The sex of the person
 * @property {string}   birth           The birthdate of the person
 * @property {string}   death           The death date of the person
 * @property {string}   timespan        The lifetime description
 * @property {string}   thumbnail       The URL of the thumbnail image
 * @property {string}   silhouette      The sex-specific silhouette URL used as image fallback
 * @property {string}   name            The full name of the individual
 * @property {NameSegment[]} nameSegments The name as ordered, drawable segments
 * @property {string}   alternativeName The alternative name of the individual
 * @property {boolean}  isNameRtl       Whether the primary name should render right-to-left
 * @property {boolean}  isAltRtl        Whether the alternative name should render right-to-left
 */

/**
 * One drawable part of a name as emitted by the PHP NameSegment::jsonSerialize(). The
 * segments are listed in display order, so the renderer only draws them.
 *
 * @typedef {object} NameSegment
 * @property {string}                                     label       The text to draw, a nickname carries its quotes and a married surname its brackets
 * @property {"given"|"surname"|"nickname"|"married"} kind        The role of the segment inside the name
 * @property {boolean}                                    isPreferred Whether the segment is the preferred given name
 */

/**
 * A single node of the chart tree as emitted by the PHP Node::jsonSerialize().
 * The node's own person data is always present, while "parents" is omitted
 * entirely for nodes without any known ancestor.
 *
 * @typedef {object} NodeDatum
 * @property {Data}        data      The person data of this node
 * @property {NodeDatum[]} [parents] The ancestor nodes, omitted when the node has none
 */

/**
 * The datum bound to the name <text> elements of a person box. It carries the
 * person node plus the pre-resolved layout flags the name renderer needs.
 *
 * @typedef {object} NameElementData
 * @property {NodeDatum} data       The person node the name belongs to
 * @property {boolean}   [isRtl]    Whether the primary name renders right-to-left
 * @property {boolean}   [isAltRtl] Whether the alternative name renders right-to-left
 * @property {boolean}   [withImage] Whether the box reserves room for a thumbnail
 */

/**
 * The datum bound to the date <text> elements of a person box. Vertical
 * layouts render a single combined timespan row (label + withImage only),
 * while horizontal layouts render one row per event, each carrying its own
 * glyph and event marker.
 *
 * @typedef {object} DateElementData
 * @property {string}  label      The formatted date text
 * @property {boolean} withImage  Whether the box reserves room for a thumbnail
 * @property {string}  [icon]     The event glyph, horizontal layouts only
 * @property {boolean} [birth]    TRUE for the birth row
 * @property {boolean} [death]    TRUE for the death row
 */

/**
 * @typedef {object} LabelElementData
 * @property {string}   label
 * @property {boolean}  isPreferred
 * @property {boolean}  isLastName
 * @property {boolean}  [isNickname]
 * @property {boolean}  isNameRtl
 */
