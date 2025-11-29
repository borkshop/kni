import {rollup} from 'rollup';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const makeHtml = async (story, output, templateArgs) => {
  try {
    // Create a virtual story module plugin
    const virtualStoryPlugin = {
      name: 'virtual-story',
      resolveId(id) {
        if (id === 'virtual:story') {
          return id;
        }
        return null;
      },
      load(id) {
        if (id === 'virtual:story') {
          return `export default ${JSON.stringify(story, null, 2)};`;
        }
        return null;
      },
    };

    // Bundle with Rollup
    const bundle = await rollup({
      input: join(__dirname, 'entry.js'),
      plugins: [
        virtualStoryPlugin,
        nodeResolve({
          rootDir: __dirname,
        }),
      ],
      external: [],
    });

    // Generate output
    const {output: outputs} = await bundle.generate({
      format: 'iife',
      name: 'kni',
    });

    const script = outputs[0].code;

    // Generate HTML
    const html = template(script, templateArgs);
    output.end(html);
  } catch (error) {
    console.error(error);
    process.exit(-1);
  }
};

export default makeHtml;

const template = (bundle, args) => {
  const title = args.title != null ? `<title>${args.title}</title>` : '';
  const bgcolor = args.backgroundColor ?? 'hsla(60, 42.00%, 66.00%, 1)';
  const color = args.color ?? 'hsla(240, 42.00%, 25.00%, 1)';

  return `<!doctype html>
<html>
    <head>
        <meta charset="utf8">
        <meta name="viewport" content="width=device-width, initial-scale=0.75">
        ${title}
        <style>
            @media handheld {
                body {
                    font-size: 150%;
                }
            }

            body {
                font-size: 200%;
                background-color: ${bgcolor};
                color: ${color};
                overflow: none;
            }

            .body {
                position: absolute;
                top: 0;
                bottom: 1.5em;
                left: 0;
                right: 0;
            }

            .kni-frame {
                position: absolute;
                height: 100%;
                width: 100%;
                overflow-y: scroll;
                transition: transform 1s ease, opacity 1s ease-out;
            }

            .kni-frame-a {
                display: table;
                height: 100%;
                width: 100%;
            }

            .kni-frame-b {
                display: table-cell;
                vertical-align: middle;
                padding: 1em;
                width: 40ex;
            }

            .kni-frame-c {
                display: flex;
                flex-direction: row;
                flex-wrap: nowrap;
                justify-content: center;
                align-items: flex-start;
            }

            .kni-body {
                display: flex-item;
                flex: 0 1 auto;
                max-width: 40ex;
                text-align: justify;
            }

            th {
                vertical-align: top;
                padding-right: 1ex;
            }

            td {
                vertical-align: top;
                cursor: pointer;
            }

            li {
                list-style-type: decimal;
            }

            a {
                color: inherit;
                font-family: 200%;
            }

            a:link {
                color: inherit;
            }

            a:hover {
                color: inherit;
            }

            a:visited {
                color: inherit;
            }

            .reset {
                position: absolute;
                height: 1em;
                bottom: 0;
                left: 0;
                margin: 10px;
            }
        </style>
    </head>
    <body>
        <div class="reset"><a href="#">reset</a></div>
        <script><!--
${bundle}
        --></script>
    </body>
</html>`;
};
