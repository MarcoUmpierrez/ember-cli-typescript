/* eslint-env node */
'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const walkSync = require('walk-sync');
const mkdirp = require('mkdirp');
const SilentError = require('silent-error');
const Command = require('ember-cli/lib/models/command');
const compile = require('../utilities/compile');
const debug = require('debug')('ember-cli-typescript:precompile');

const PRECOMPILE_MANIFEST = 'tmp/.ts-precompile-manifest';

module.exports = Command.extend({
  name: 'ts:precompile',
  works: 'insideProject',
  description:
    'Generates JS and declaration files from TypeScript sources in preparation for publishing.',

  availableOptions: [{ name: 'manifest-path', type: String, default: PRECOMPILE_MANIFEST }],

  run({ manifestPath }) {
    let { project } = this;
    let outDir = `${os.tmpdir}/e-c-ts-precompile-${process.pid}`;
    let flags = ['--declaration', '--sourceMap', 'false'];

    return compile({ project, outDir, flags }).then(() => {
      let output = [];
      for (let declSource of walkSync(outDir, { globs: ['**/*.d.ts'] })) {
        if (declSource.indexOf('addon') !== 0) {
          if (declSource.indexOf('app') === 0) {
            throw new SilentError(
              "Including .ts files in your addon's `app` directory is unsupported. " +
                'See <link to README or something>.'
            );
          }

          debug('skipping non-addon file %s', declSource);
          continue;
        }

        let declDest = declSource.replace(/^addon\//, '');
        let compiled = declSource.replace(/\.d\.ts$/, '.js');

        debug('copying declaration: %s', declDest);
        fs.copyFileSync(`${outDir}/${declSource}`, declDest);
        output.push(declDest);

        debug('copying compiled JS: %s', compiled);
        fs.copyFileSync(`${outDir}/${compiled}`, compiled);
        output.push(compiled);
      }

      mkdirp.sync(path.dirname(manifestPath));
      fs.writeFileSync(manifestPath, JSON.stringify(output));
    });
  },
});

module.exports.PRECOMPILE_MANIFEST = PRECOMPILE_MANIFEST;