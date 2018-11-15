[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)
[![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/magicsunday/webtrees-pedigree-chart/badges/quality-score.png?b=master)](https://scrutinizer-ci.com/g/magicsunday/webtrees-pedigree-chart/?branch=master)
[![Code Climate](https://codeclimate.com/github/magicsunday/webtrees-pedigree-chart/badges/gpa.svg)](https://codeclimate.com/github/magicsunday/webtrees-pedigree-chart)
[![Test Coverage](https://codeclimate.com/github/magicsunday/webtrees-pedigree-chart/badges/coverage.svg)](https://codeclimate.com/github/magicsunday/webtrees-pedigree-chart/coverage)
[![Issue Count](https://codeclimate.com/github/magicsunday/webtrees-pedigree-chart/badges/issue_count.svg)](https://codeclimate.com/github/magicsunday/webtrees-pedigree-chart)

# D3 pedigree chart
This modules provides an SVG pedigree chart for the [webtrees](https://www.webtrees.net) genealogy application.


## Installation
### Using Composer
To install using [composer](https://getcomposer.org/), just run the following command from the command line 
at the root directory of your webtrees installation.

``` 
composer require magicsunday/webtrees-pedigree-chart --update-no-dev
```

The module will automatically installed into the ``modules_v3`` directory of your webtrees installation.

To remove the module run:
```
composer remove magicsunday/webtrees-pedigree-chart --update-no-dev
```

### Using Git
If you are using ``git``, you could also clone the current master branch directly into your ``modules_v3`` directory 
by calling:

```
git clone https://github.com/magicsunday/webtrees-pedigree-chart.git modules_v3/webtrees-pedigree-chart
```

### Manual installation
To manually install the module, perform the following steps:

1. Download the [latest release](https://github.com/magicsunday/webtrees-pedigree-chart/releases/latest).
2. Upload the downloaded file to your web server.
3. Unzip the package into your ``modules_v3`` directory.
4. Rename the folder to ``webtrees-pedigree-chart``

## Enable module
Go to the control panel (admin section) of your installation and click on the ``Module administration`` link 
inside the ``Modules`` section. Enable the ``Pedigree chart`` module and save your settings.


## Usage
At the charts menu, you will find a new link called `Pedigree chart`.


## Development
To build/update the javascript, run the following commands:

```
npm install
npm run prepare
```
