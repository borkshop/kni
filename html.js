'use strict';

const System = require('system');
const bundleSystemId = require('system/bundle').bundleSystemId;
const Location = require('system/location');

const makeHtml = (story, output, templateArgs) => {
  const location = Location.fromDirectory(__dirname);
  const id = './template';

  return System.load(location, {
    node: true,
  })
    .then((buildSystem) => {
      return System.load(location, {
        browser: true,
        buildSystem: buildSystem,
      }).then((system) => {
        // Preempt the loader with a the prepared story:
        const module = system.lookup('./story.json');
        module.text = 'module.exports = ' + JSON.stringify(story, null, 4);
        module.factory = () => {};

        return bundleSystemId(system, id);
      });
    })
    .then((script) => {
      return template(script, templateArgs);
    })
    .then((bundle) => {
      output.end(bundle);
    })
    .catch((error) => {
      console.error(error);
      process.exit(-1);
    });
};
module.exports = makeHtml;

const template = (bundle, args) => {
  let title = '';
  if (args.title != null) {
    title = '<title>' + title + '</title>';
  }
  let bgcolor = 'hsla(60, 42.00%, 66.00%, 1)';
  if (args.backgroundColor != null) {
    bgcolor = args.backgroundColor;
  }
  let color = 'hsla(240, 42.00%, 25.00%, 1)';
  if (args.color != null) {
    color = args.color;
  }
  return [
    '<!doctype html>',
    '<html>',
    '    <head>',
    '        <meta charset="utf8">',
    '        <meta name="viewport" content="width=device-width, initial-scale=0.75">',
    title,
    '        <style>',
    '            @media handheld {',
    '                body {',
    '                    font-size: 150%;',
    '                }',
    '            }',
    '',
    '            body {',
    '                font-size: 200%;',
    '                background-color: ',
    bgcolor,
    ';',
    '                color: ',
    color,
    ';',
    '                overflow: none;',
    '            }',
    '',
    '            .body {',
    '                position: absolute;',
    '                top: 0;',
    '                bottom: 1.5em;',
    '                left: 0;',
    '                right: 0;',
    '            }',
    '',
    '            .kni-frame {',
    '                position: absolute;',
    '                height: 100%;',
    '                width: 100%;',
    '                overflow-y: scroll;',
    '                transition: transform 1s ease, opacity 1s ease-out;',
    '            }',
    '',
    '            .kni-frame-a {',
    '                display: table;',
    '                height: 100%;',
    '                width: 100%;',
    '            }',
    '',
    '            .kni-frame-b {',
    '                display: table-cell;',
    '                vertical-align: middle;',
    '                padding: 1em;',
    '                width: 40ex;',
    '            }',
    '',
    '            .kni-frame-c {',
    '                display: flex;',
    '                flex-direction: row;',
    '                flex-wrap: nowrap;',
    '                justify-content: center;',
    '                align-items: flex-start;',
    '            }',
    '',
    '            .kni-body {',
    '                display: flex-item;',
    '                flex: 0 1 auto;',
    '                max-width: 40ex;',
    '                text-align: justify;',
    '            }',
    '',
    '            th {',
    '                vertical-align: top;',
    '                padding-right: 1ex;',
    '            }',
    '',
    '            td {',
    '                vertical-align: top;',
    '                cursor: pointer;',
    '            }',
    '',
    '            li {',
    '                list-style-type: decimal;',
    '            }',
    '',
    '            a {',
    '                color: inherit;',
    '                font-family: 200%;',
    '            }',
    '',
    '            a:link {',
    '                color: inherit;',
    '            }',
    '',
    '            a:hover {',
    '                color: inherit;',
    '            }',
    '',
    '            a:visited {',
    '                color: inherit;',
    '            }',
    '',
    '            .reset {',
    '                position: absolute;',
    '                height: 1em;',
    '                bottom: 0;',
    '                left: 0;',
    '                margin: 10px;',
    '            }',
    '        </style>',
    '    </head>',
    '    <body>',
    '        <div class="reset"><a href="#">reset</a></div>',
    '        <script><!--',
    bundle,
    '        --></script>',
    '    </body>',
    '</html>',
  ].join('\n');
}
