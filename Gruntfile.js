const fs = require("fs");
const sass = require("sass");

module.exports = function (grunt) {
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-concat");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-connect");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-replace");

  require("load-grunt-tasks")(grunt); //babel, sass

  grunt.registerTask("configure", ["clean:pre"]);

  grunt.registerTask("compile", [
    "copy:scss",
    "copy:scss_dist",
    "copy:scss_plugins",
    "concat:js",
    "sass:build",
    "replace",
    "build_standalone",
    "uglify",
    "clean:post",
  ]);

  grunt.registerTask("default", ["configure", "compile"]);

  grunt.registerTask("serve", ["connect", "watch"]);

  grunt.registerTask("build_standalone", "", function () {
    var i,
      n,
      source,
      name,
      path,
      modules = [];

    // amd definitions must be changed to be not anonymous
    // @see https://github.com/brianreavis/selectize.js/issues/89
    files = [];
    for (i = 0, n = files_js_dependencies.length; i < n; i++) {
      path = files_js_dependencies[i];
      name = path.match(/([^\/]+?).js$/)[1];
      source = grunt.file
        .read(path)
        .replace("define(factory);", "define('" + name + "', factory);");
      modules.push(source);
    }

    path = "dist/js/selectize.js";
    source = grunt.file
      .read(path)
      .replace(/define\((.*?)factory\);/, "define('selectize', $1factory);");
    modules.push(source);

    // write output
    path = "build/js/standalone/selectize.js";
    grunt.file.write(path, modules.join("\n\n"));
    grunt.log.writeln('Built "' + path + '".');
  });

  var files_js = [
    "src/contrib/*.js",
    "src/*.js",
    "!src/.wrapper.js",
    "!src/defaults.js",
    "!src/selectize.js",
    "!src/selectize.jquery.js",
    "src/selectize.js",
    "src/defaults.js",
    "src/selectize.jquery.js",
  ];

  var files_js_dependencies = [
    "node_modules/sifter/sifter.js",
    "node_modules/microplugin/src/microplugin.js",
  ];

  var scss_plugin_files = [];

  // enumerate plugins
  (function () {
    var selector_plugins = grunt.option("plugins");
    if (!selector_plugins) return;

    if (selector_plugins.indexOf(",") !== -1) {
      selector_plugins =
        "{" + selector_plugins.split(/\s*,\s*/).join(",") + "}";
    }

    // javascript
    files_js.push("src/plugins/" + selector_plugins + "/*.js");

    // scss (css)
    var matched_files = grunt.file.expand([
      "src/plugins/" + selector_plugins + "/plugin.scss",
    ]);
    for (var i = 0, n = matched_files.length; i < n; i++) {
      var plugin_name = matched_files[i].match(/src\/plugins\/(.+?)\//)[1];
      scss_plugin_files.push({
        src: matched_files[i],
        dest: "build/scss/plugins/" + plugin_name + ".scss",
      });
      scss_plugin_files.push({
        src: matched_files[i],
        dest: "dist/scss/plugins/" + plugin_name + ".scss",
      });
    }
  })();

  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    clean: {
      pre: ["dist", "build/*"],
      post: ["**/*.tmp*"],
    },
    copy: {
      scss: {
        files: [
          {
            expand: true,
            flatten: true,
            src: ["src/scss/*.scss"],
            dest: "build/scss",
          },
        ],
      },
      scss_dist: {
        files: [
          {
            expand: true,
            flatten: true,
            src: ["build/scss/*.scss"],
            dest: "dist/scss",
          },
        ],
      },
      scss_plugins: { files: scss_plugin_files },
    },

    replace: {
      options: { prefix: "@@" },
      main: {
        options: {
          variables: {
            version: "<%= pkg.version %>",
            js: '<%= grunt.file.read("build/js/selectize.js").replace(/\\n/g, "\\n\\t") %>',
            css: '<%= grunt.file.read("dist/css/selectize.css") %>',
          },
        },
        files: [
          { src: ["src/.wrapper.js"], dest: "dist/js/selectize.js" }
        ],
      },
      css_post: {
        options: {
          variables: {
            version: "<%= pkg.version %>",
          },
        },
        files: [
          { expand: true, flatten: false, src: ["dist/css/*.css"], dest: "" },
          { expand: true, flatten: false, src: ["dist/scss/*.scss"], dest: "" },
          {
            expand: true,
            flatten: false,
            src: ["dist/scss/plugins/*.scss"],
            dest: "",
          },
        ],
      },
    },
    sass: {
      options: {
        implementation: sass,
        style: "expanded",
        outputStyle: "compressed",
      },
      build: {
        files: [
          {
            "dist/css/selectize.css": ["src/scss/selectize.scss"],
            "dist/css/selectize.default.css": [
              "src/scss/selectize.default.scss",
            ],
            "dist/css/selectize.bootstrap3.css": [
              "src/scss/selectize.bootstrap3.scss",
            ],
            "dist/css/selectize.bootstrap4.css": [
              "src/scss/selectize.bootstrap4.scss",
            ],
            "dist/css/selectize.bootstrap5.css": [
              "src/scss/selectize.bootstrap5.scss",
            ],
          },
        ],
      },
    },
    concat: {
      options: {
        stripBanners: true,
        separator: grunt.util.linefeed + grunt.util.linefeed,
      },
      js: {
        files: { "build/js/selectize.js": files_js },
      },
    },
    connect: {
      server: {
        options: {
          port: 4000,
          hostname: "*",
        },
      },
    },
    uglify: {
      main: {
        options: {
          banner:
            "/*! selectize.js - v<%= pkg.version %> | https://github.com/selectize/selectize.js | Apache License (v2) */\n",
          report: "gzip",
          "ascii-only": true,
          mangle: false,
        },
        files: {
          "dist/js/selectize.min.js": ["build/js/selectize.js"],
          "dist/js/standalone/selectize.js": [
            "build/js/standalone/selectize.js",
          ],
          "dist/js/standalone/selectize.min.js": [
            "build/js/standalone/selectize.js",
          ],
        },
      },
    },
    watch: {
      files: ["src/**/*.js"],
      tasks: ["concat:js", "build_standalone"],
    },
  });
};
