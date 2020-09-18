/* eslint-disable */
const chalk = require('chalk');
const concat = require('broccoli-concat');
const interrupt = require('ember-cli/lib/utilities/will-interrupt-process');
const path = require('path');
const globSync = require('glob').sync;
const mergeTrees = require('ember-cli/lib/broccoli/merge-trees');

interrupt.capture(process);

const Builder = require('ember-cli/lib/models/builder');
const BroccoliPlugin = require('broccoli-plugin');
const EmberAddon = require('ember-cli/lib/broccoli/ember-addon');
const Funnel = require('broccoli-funnel');
const Project = require('ember-cli/lib/models/project');

process.env['EMBER_ENV'] = 'development';
process.env['EMBER_CLI_DELAYED_TRANSPILATION'] = true;

class _EmptyNode extends BroccoliPlugin {
  constructor(options = {}) {
    super([], { annotation: options.annotation });
  }

  build() {
    return Promise.resolve();
  }

  isEmpty(node) {
    return this === node;
  }
}

const EmptyNode = new _EmptyNode();
mergeTrees._overrideEmptyTree(EmptyNode);

const cwd = process.cwd();
const pkg = require(path.join(cwd, 'package.json'));
const out = 'ember-data';

const workspaces = {};
if (pkg.workspaces) {
  for (const pattern of pkg.workspaces) {
    Object.assign(
      workspaces,
      globSync(path.join(pattern, 'package.json'), { cwd }).reduce((hash, file) => {
        const abs = path.join(cwd, file);
        const pkg = require(abs);
        hash[pkg.name] = { path: path.dirname(abs), pkg };
        return hash;
      }, {})
    );
  }
} else {
  Object.assign(workspaces, { [pkg.name]: { path: cwd, pkg } });
}

EmberAddon.prototype.toTree = function(additionalTrees) {
  //TODO MMP Enable addon templates...

  const addonBundles = this.project.addons.reduce((bundles, addon) => {
    if (addon.name in workspaces) {
      const bundle = Object.create(null);
      bundle.name = addon.name;
      bundle.root = addon.root;
      bundle.addonTree = addon.treeFor('addon');
      //bundle.appTree = addon.treeFor('app');
      bundles.push(bundle);
    }
    return bundles;
  }, []);

  //let appTree = mergeTrees(addonBundles.map(({ appTree }) => appTree));
  let appTree = new Funnel('app', {                                             // app
    destDir: out,
    getDestinationPath(relativePath) {
      let prefixes = ['initializers/', 'instance-initializers/'];
      for (const prefix of prefixes) {
        let index = relativePath.indexOf(prefix);
        if (index === 0) return `${prefix}/initializer.js`;
      }
      return relativePath;
    },
  });

  let addonTree = mergeTrees(addonBundles.map(({ addonTree }) => addonTree), { overwrite: true });
  //addonTree = this._compileAddonTree(addonTree, { skipTemplates: false });
  addonTree = new Funnel(addonTree, { destDir: 'addon-tree-output' });          // addon-tree-output

  this._defaultPackager.name = out;                                             // ensure packager uses addon name
  let sources = mergeTrees([addonTree, appTree]);                               // addon-tree-output + app
  let processed = mergeTrees([
    this._defaultPackager.applyCustomTransforms(sources),
    this._defaultPackager.processJavascript(sources)
  ], { overwrite: true });
  let combined = concat(processed, {                                            // ember-data.[js|map]
    inputFiles: ['addon-tree-output/**/*.js', `${out}/**/*.js`],
    headerFiles: [],
    footerFiles: [],
    outputFile: `${out}.js`,
    separator: '\n;',
    sourceMapConfig: this.options.sourcemaps,
  });
  return this.addonPostprocessTree('all', combined);
};

const project = Project.closestSync(workspaces[out].path);
const ui = project.ui;
const builder = new Builder({
  environment: 'development',
  outputPath: '../../dist/',
  project,
  ui,
});
const addon = project.addons[0].app;

//main
function build(addon, promise) {
  ui.writeLine(chalk.green(`Building ${addon.name}`));

  let annotation = {
    type: 'initial',
    reason: 'build',
    primaryFile: null,
    changedFiles: [],
  };

  let onInterrupt;

  promise = promise
    .then(() => {
      interrupt.addHandler(onInterrupt);
      return builder
        .build(null, annotation)
        .then(r => {
          const time = r.graph.buildState.selfTime;
          ui.writeLine(
            chalk.green(`Built ${addon.name} successfully in ${time} ms. Stored in "${builder.outputPath}".`)
          );
          return r;
        })
        .finally(() => {
          ui.stopProgress();
        });
    })
    .then(() => {
      interrupt.removeHandler(onInterrupt);
    })
    .catch(e => {
      ui.writeLine(chalk.red(`Failed to build ${addon.name}.`));
      ui.writeError(e);
    });

  onInterrupt = () => Promise.resolve(promise);

  return promise;
}
// builder.tree = tree;
// builder.builder = new (require('broccoli').Builder)(tree);
let promise = Promise.resolve();
// for (const key in bundles) {
// noinspection JSUnfilteredForInLoop
// const b = bundles[key];
const p = promise;
promise = promise.then(() => build(addon, p));
// }
promise
  .catch(e => ui.writeError(e))
  .finally(() => {
    builder.cleanup();
    process.exit();
  });
