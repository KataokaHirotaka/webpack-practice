module.exports = {
  plugins: [
    require("autoprefixer")({
      overrideBrowserslist: ["IE 11", "last 2 versions"]
    }),
    require("cssnano")({
      preset: "default"
    })
  ]
};
