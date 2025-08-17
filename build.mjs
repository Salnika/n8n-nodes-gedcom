import { build } from 'esbuild';

// Bundle the GEDCOM node with dependencies
await build({
	entryPoints: ['dist/nodes/Gedcom/Gedcom.node.js'],
	bundle: true,
	outfile: 'dist/nodes/Gedcom/Gedcom.node.bundled.js',
	platform: 'node',
	target: 'node20',
	format: 'cjs',
	external: ['n8n-workflow', 'n8n-core'],
	minify: false,
	sourcemap: false,
	treeShaking: false,
});

console.log('✅ Bundled GEDCOM node with dependencies');