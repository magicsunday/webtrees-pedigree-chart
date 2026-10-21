<?php

/**
 * This file is part of the package magicsunday/webtrees-pedigree-chart.
 *
 * For the full copyright and license information, please read the
 * LICENSE file that was distributed with this source code.
 */

declare(strict_types=1);

namespace MagicSunday\Webtrees\PedigreeChart\Test\Support;

use Aura\Router\Map;
use Aura\Router\Route;
use Fisharebest\Webtrees\Contracts\ContainerInterface;
use Fisharebest\Webtrees\Contracts\RouteFactoryInterface;
use Fisharebest\Webtrees\Registry;
use GuzzleHttp\Psr7\HttpFactory;
use Psr\Http\Message\ResponseFactoryInterface;

use function in_array;

/**
 * Registers the route factory and the container that the global route() and
 * redirect() helpers of webtrees resolve.
 *
 * @author  Rico Sonntag <mail@ricosonntag.de>
 * @license https://opensource.org/licenses/GPL-3.0 GNU General Public License v3.0
 * @link    https://github.com/magicsunday/webtrees-pedigree-chart/
 */
final class RouteFactoryFixture
{
    /**
     * Registers a route factory that renders a route as a plain path with its
     * query string, and a container that hands out the PSR-17 response factory
     * the global redirect() helper resolves.
     */
    public static function register(): void
    {
        $routeFactory = new class implements RouteFactoryInterface {
            public function route(string $route_name, array $parameters = []): string
            {
                return '/route/' . $route_name . '?' . http_build_query($parameters);
            }

            public function routeMap(): Map
            {
                return new Map(new Route());
            }
        };

        $container = new readonly class($routeFactory, new HttpFactory()) implements ContainerInterface {
            public function __construct(
                private RouteFactoryInterface $routeFactory,
                private ResponseFactoryInterface $responseFactory,
            ) {
            }

            public function get(string $id): object
            {
                return $id === ResponseFactoryInterface::class ? $this->responseFactory : $this->routeFactory;
            }

            public function has(string $id): bool
            {
                return in_array($id, [RouteFactoryInterface::class, ResponseFactoryInterface::class], true);
            }

            public function set(string $id, object $object): static
            {
                return $this;
            }
        };

        Registry::routeFactory($routeFactory);
        Registry::container($container);
    }
}
