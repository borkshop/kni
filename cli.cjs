#!/usr/bin/env node
const url = require('node:url');
const here = url.pathToFileURL(__filename);
import(new URL('kni.js', here).href).then(ns => {
  ns.default(null, process.stdout, err => {
    if (err) {
      console.error(typeof err === 'object' && err.message ? err.message : err);
      if (typeof err.story === 'object' && err.story) {
        const story = err.story;
        dump(story.errors, process.stderr);
      }
      process.exit(-1);
    }
  });
});
