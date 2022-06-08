import { build } from 'esbuild';

if(process.argv.length !== 3) {
  console.error('Missing argument: base name of file');
  process.exit(1);
}

const basename = process.argv[2];

build({
  entryPoints: [`./src/data/tweets/${basename}.ts`],
  outfile: `./src/data/tweets/${basename}.mjs`,
  minify: false,
  bundle: true,
  platform: 'node',
  target: ['node18'],
  format: 'esm',
  tsconfig: './tsconfig.scripts.json'
}).catch(() => process.exit(1));
