[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)
[![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/magicsunday/webtrees-pedigree-chart/badges/quality-score.png?b=master)](https://scrutinizer-ci.com/g/magicsunday/webtrees-pedigree-chart/?branch=master)
[![Code Climate](https://codeclimate.com/github/magicsunday/webtrees-pedigree-chart/badges/gpa.svg)](https://codeclimate.com/github/magicsunday/webtrees-pedigree-chart)
[![Test Coverage](https://codeclimate.com/github/magicsunday/webtrees-pedigree-chart/badges/coverage.svg)](https://codeclimate.com/github/magicsunday/webtrees-pedigree-chart/coverage)
[![Issue Count](https://codeclimate.com/github/magicsunday/webtrees-pedigree-chart/badges/issue_count.svg)](https://codeclimate.com/github/magicsunday/webtrees-pedigree-chart)

# Pedigree chart
This module provides an SVG pedigree chart for the [webtrees](https://www.webtrees.net) genealogy application. It 
is capable to displays up to 25 ancestor generations of an individual. 

![pedigree-chart-3-generations](assets/pedigree-chart-3-generations.png)
*Fig. 1: A three generations pedigree chart (drawn top to bottom)*

![pedigree-chart-5-generations](assets/pedigree-chart-5-generations.png)
*Fig. 2: A five generations pedigree chart (drawn left to right)*

**Caution: If you are rendering a lot of generations it may take a while and even slow down your system.**

## Installation
Requires webtrees 2.0.

### Using Composer
To install using [composer](https://getcomposer.org/), just run the following command from the command line 
at the root directory of your webtrees installation.

``` 
composer require magicsunday/webtrees-pedigree-chart --update-no-dev
```

The module will automatically install into the ``modules_v4`` directory of your webtrees installation.

To remove the module run:
```
composer remove magicsunday/webtrees-pedigree-chart --update-no-dev
```

### Using Git
If you are using ``git``, you could also clone the current master branch directly into your ``modules_v4`` directory 
by calling:

```
git clone https://github.com/magicsunday/webtrees-pedigree-chart.git modules_v4/webtrees-pedigree-chart
```

### Manual installation
To manually install the module, perform the following steps:

1. Download the [latest release](https://github.com/magicsunday/webtrees-pedigree-chart/releases/latest).
2. Upload the downloaded file to your web server.
3. Unzip the package into your ``modules_v4`` directory.
4. Rename the folder to ``webtrees-pedigree-chart``


## Enable module
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

```
npm install --unsafe-perm --save-dev
npm run prepare
```
