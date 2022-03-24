const path = require('path');
const globule = require('globule'); //ワイルドカードでファイルを探してくれる
const MiniCssExtractPlugin = require("mini-css-extract-plugin"); // webpackで生成したJavaScriptやCSSを埋め込んだHTMLを生成する
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { fstat } = require('fs'); // ファイルを扱うためのモジュール
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');
const BrowserSyncPlugin = require('browser-sync-webpack-plugin');
const FixStyleOnlyEntriesPlugin = require('webpack-fix-style-only-entries'); // 別ファイルとして出力したときに生成される不要なJavaScriptを削除する

const dir = {
  src: "./src",
  public: "./htdocs",
  dist: "./htdocs/",
};
const convertExtensions = {
  pug: "html",
  js: "js",
  scss: "css",
};
const entries = getEntries(convertExtensions);
const data = {};
const HtmlWebpackPlugins = [];
const ProvidePluginOption = {
  $: "jquery",
};

const BrowserSyncOption = {
  files: `${dir.public}/**/*`,
  server: { baseDir: dir.public },
  open: "external", // IPアドレスでアクセス
  startPath: dir.dist.replace(dir.public, ""),
  rewriteRules: [
    {
      // SSI を置換.
      match: new RegExp('<!--#include virtual="(.+)"-->', "g"),
      fn: (req, res, match, filename) => {
        const ssiPath = path.join(__dirname, dir.public, filename);
        return fs.existsSync(ssiPath)
          ? fs.readFileSync(ssiPath)
          : `<p style="color: red">${filename} could not be found</p>`;
      },
    },
  ],
}

/**
 * ページの数だけ HtmlWebpackPlugin を自動で追加
 */
for (const [output, src] of Object.entries(entries.pug)) {
  HtmlWebpackPlugins.push(
    new HtmlWebpackPlugin({
      inject: false, // - inject: false - script タグを動的に挿入しなくなる.
      data: data,
      filename: output,
      template: src,
      minify: {
        collapseWhitespace: true,
        preserveLineBreaks: true,
      },
    })
  );

}


/**
 * コンパイル対象を自動で追加する
 * key: コンパイル対象の拡張子, val: コンパイル後の拡張子
 */
 function getEntries(convertExtensions) {
  const entries = {};
  for (const [key, val] of Object.entries(convertExtensions)) {
    const entry = (entries[key] = {});

    // コンパイル対象のファイルを抽出.
    const targetFileNames = globule.find({
      src: [`**/*.${key}`, `!**/_*.${key}`, `**/_template.${key}`], // 先頭に _ がつくファイルは対象外.
      srcBase: dir.src,
    });

    targetFileNames.forEach((fileName) => {
      let output = fileName.replace(new RegExp(key, "g"), `${val}`); // フォルダ名と拡張子を置換.

      if (val.match("html")) {
        output = output.replace(`${val}/`, "");
        entry[output] = `${dir.src}/${fileName}`;
        return;
      }

      entry[`assets/${output}`] = `${dir.src}/${fileName}`;
    });
  }

  return entries;
}


const rules = {
  js: {
    test: /\.js$/,
    exclude: /node_modules/,
    use: [
      {
        loader: 'babel-loader',
        options: {
          presets: [["@babel/preset-env", { modules: false }]], // ES2015以降で書かれたコードもES5以前のコードへ変換される
        }
      }
    ]
  },
  scss: {
    test: /\.(c|sa|sc)ss$/,
    use: [
      MiniCssExtractPlugin.loader, // cssファイルとjsファイルを別々にして吐き出す
      {
        loader: "css-loader",
        options: { url: false },
      },
      "postcss-loader",
      "sass-loader",
    ],
  },
  pug: {
    test: /\.pug$/,
    use: [
      {
        loader: "pug-loader",
        options: {
          pretty: true,
          root: path.resolve(__dirname, `${dir.src}/pug`),
        },
      },
    ],
  },
  esLint: {
    test: /\.js$/,
    exclude: /node_modules/,
    use: [
      'babel-loader',
      'eslint-loader',
    ]
  }
}

module.exports = () => {
  return [
    {
      entry: entries.js,
      output: {
        filename: "[name]",
        path: path.join(__dirname, dir.dist),
      },
      module: {
        rules: [rules.js, rules.pug],
      },
      optimization: {
        splitChunks: {
          // 共通モジュールを出力
          cacheGroups: {
            vendor: {
              test: /node_modules/, // node_modulesのみバンドル対象とする
              name: "./assets/js/vendor.js",
              chunks: "initial",
              enforce: true,
            },
          },
        },
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              compress: {drop_console: true}, // ビルド時に conole.log を削除
            },
          }),
        ],
      },
      plugins: [
        new BrowserSyncPlugin(BrowserSyncOption),
        new webpack.ProvidePlugin(ProvidePluginOption), // 外部ライブラリの読み込み
        // new MomentLocalesPlugin({ localesToKeep: ["ja"] }),
      ].concat(HtmlWebpackPlugins),
    },
    {
      entry: entries.scss,
      output: {
        path: path.join(__dirname, dir.dist),
      },
      module: {
        rules: [rules.scss],
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: "[name]",
        }),
        new FixStyleOnlyEntriesPlugin(), // 同名のjsファイルを出力させない
      ],
    },
  ];
};

// module.exports = {
//   mode: "development",
//   entry: "./src/app.js", // バンドルの起点となるファイル
//   output: {
//     path: path.resolve(__dirname, 'public'), // 出力されるディレクトリの指定
//     filename: 'bundle.js' // 出力されるファイル名の指定
//   },
//   module: {
//     rules: [
//       {
//         test: /\.scss$/, // $は末尾を表す
//         uwe: [
//           'style-loader', // cssをhtmlにstyleタグとして出力
//           'css-loader', // jsにバンドルされる
//           'sass-loader' // cssに変換、コンパイルする
//         ]
//       }
//     ]
//   }
// }

