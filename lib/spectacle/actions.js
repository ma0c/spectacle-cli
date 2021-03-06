'use strict';

const path = require('path');
const { promisify } = require('util');

const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const baseCfg = require('../../config/webpack.config.cli');
const {
  modes,
  themeRe,
  themeTmpl,
  templateRe,
  templateTmpl
} = require('../templates/replacements');

const webpackConfig = async ({
  mode = 'development',
  title,
  srcFilePath,
  themeFilePath,
  templateFilePath,
  output
}) => {
  // Use a simplified "markdown only" template for `.md` files.
  const srcMode = path.extname(srcFilePath).replace('.', '');
  const tmplDir = `../templates/${srcMode}-slides`;

  // Webpack compiler + configuration.
  const entry = path.resolve(__dirname, `${tmplDir}/index.js`);
  const template = path.resolve(__dirname, `${tmplDir}/index.html`);

  return {
    ...baseCfg,
    mode,
    // TODO(4): Add option to provide different context.
    // https://github.com/FormidableLabs/spectacle-cli/issues/4
    context: process.cwd(),
    entry,
    module: {
      ...baseCfg.module,
      rules: [
        {
          test: entry,
          use: [
            {
              loader: require.resolve('../webpack/inject-loader'),
              options: {
                replacements: [
                  {
                    pattern: modes[srcMode].re,
                    replacement: modes[srcMode].tmpl(srcFilePath)
                  },
                  templateFilePath
                    ? {
                        pattern: templateRe,
                        replacement: templateTmpl(templateFilePath)
                      }
                    : null,
                  themeFilePath
                    ? {
                        pattern: themeRe,
                        replacement: themeTmpl(themeFilePath)
                      }
                    : null
                ].filter(Boolean)
              }
            }
          ]
        },
        ...baseCfg.module.rules
      ]
    },
    output: {
      path: path.resolve(output || 'dist'),
      pathinfo: mode === 'development',
      // TODO(5): Allow user-specified output bundle name?
      // https://github.com/FormidableLabs/spectacle-cli/issues/5
      filename: `deck${mode === 'production' ? '.min' : ''}.js`
    },
    plugins: [new HtmlWebpackPlugin({ title, template })]
  };
};

// Build output action.
const build = async ({
  title,
  srcFilePath,
  themeFilePath,
  templateFilePath,
  output
}) => {
  const mode = 'production';
  const compiler = webpack(
    await webpackConfig({
      mode,
      title,
      srcFilePath,
      themeFilePath,
      templateFilePath,
      output
    })
  );

  return promisify(compiler.run.bind(compiler))();
};

// Dev server action.
const server = async ({
  port,
  title,
  srcFilePath,
  themeFilePath,
  templateFilePath
}) => {
  const compiler = webpack(
    await webpackConfig({
      title,
      srcFilePath,
      themeFilePath,
      templateFilePath
    })
  );
  const config = { hot: true };
  const devServer = new WebpackDevServer(compiler, config);

  return promisify(devServer.listen.bind(devServer))(port, 'localhost');
};

module.exports = {
  build,
  server
};
