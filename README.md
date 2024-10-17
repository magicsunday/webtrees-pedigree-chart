[![Latest version](https://img.shields.io/github/v/release/magicsunday/webtrees-pedigree-chart?sort=semver)](https://github.com/magicsunday/webtrees-pedigree-chart/releases/latest)
[![License](https://img.shields.io/github/license/magicsunday/webtrees-pedigree-chart)](https://github.com/magicsunday/webtrees-pedigree-chart/blob/main/LICENSE)
[![CI](https://github.com/magicsunday/webtrees-pedigree-chart/actions/workflows/ci.yml/badge.svg)](https://github.com/magicsunday/webtrees-pedigree-chart/actions/workflows/ci.yml)


<!-- TOC -->
* [Pedigree chart](#pedigree-chart)
  * [Installation](#installation)
    * [Manual installation](#manual-installation)
    * [Using Composer](#using-composer)
      * [Latest version](#latest-version)
    * [Using Git](#using-git)
  * [Configuration](#configuration)
  * [Usage](#usage)
  * [Development](#development)
    * [Run tests](#run-tests)
<!-- TOC -->


# Pedigree chart
This module provides an SVG pedigree chart for the [webtrees](https://www.webtrees.net) genealogy application.
It is capable of displaying up to 25 generations of ancestors from an individual.

**But beware, if you select too many generations, it may take a while and even slow down your system significantly.**

![pedigree-chart-3-generations](assets/pedigree-chart-top-bottom.png)
*Fig. 1: A five-generations pedigree chart (drawn top to bottom)*

![pedigree-chart-5-generations](assets/pedigree-chart-5-generations.png)
*Fig. 2: A five-generations pedigree chart (drawn left to right)*


## Installation
Requires webtrees 2.1.

There are several ways to install the module. The method using [composer](#using-composer) is suitable
for experienced users, as a developer you can also use [git](#using-git) to get a copy of the repository. For all other users,
however, manual installation is recommended.

### Manual installation
To manually install the module, perform the following steps:

1. Download the [latest release](https://github.com/magicsunday/webtrees-pedigree-chart/releases/latest) of the module.
2. Upload the downloaded file to your web server.
3. Unzip the package into your ``modules_v4`` directory.
4. Rename the folder to ``webtrees-pedigree-chart``

If everything was successful, you should see a subdirectory ``webtrees-pedigree-chart`` with the unpacked content
in the ``modules_v4`` directory.

Then follow the steps described in [configuration](#configuration) and [usage](#usage).


### Using Composer
Typically, to install with [composer](https://getcomposer.org/), just run the following command from the command line,
from the root of your Webtrees installation.

```shell
composer require magicsunday/webtrees-pedigree-chart --update-no-dev
```

The module will automatically install into the ``modules_v4`` directory of your webtrees installation.

To remove the module run:
```shell
composer remove magicsunday/webtrees-pedigree-chart --update-no-dev
```

Then follow the steps described in [configuration](#configuration) and [usage](#usage).

#### Latest version
If you are using the development version of Webtrees (main branch), you may also need to install the development
version of the module. For this, please use the following command:
```shell
composer require magicsunday/webtrees-pedigree-chart:dev-master --update-no-dev
```


### Using Git
If you are using ``git``, you could also clone the current master branch directly into your ``modules_v4`` directory 
by calling:

```shell
git clone https://github.com/magicsunday/webtrees-pedigree-chart.git modules_v4/webtrees-pedigree-chart
```

Then follow the steps described in [configuration](#configuration) and [usage](#usage).


## Configuration
Go to the control panel (admin section) of your installation and scroll down to the ``Modules`` section. Click
on ``Charts`` (in subsection Genealogy). Enable the ``Pedigree chart`` custom module (optionally disable the original
installed pedigree chart module) and save your settings.

![control-panel-modules](assets/control-panel-modules.png)
*Fig. 3: Control panel - Module administration*


## Usage
At the charts' menu, you will find a new link called `Pedigree chart`. Use the provided configuration options
to adjust the layout of the charts according to your needs.


## Development
To build/update the javascript, run the following commands:

```shell
nvm install node
npm install
npm run prepare
```

### Run tests
```shell
composer update

composer ci:test
composer ci:test:php:phpstan
composer ci:test:php:lint
composer ci:test:php:unit
composer ci:test:php:rector
```
