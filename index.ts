import { or, concat, chars, kleene } from './re';
import { toDfa } from './dfa';
import { toAst } from './codegen';
import { generate } from 'escodegen';
import { writeFileSync } from 'fs';

let sampleRe = or(
	concat(chars('a'), chars('c'), chars('1')),
	concat(chars('a'), chars('d'), chars('1')),
	concat(kleene(chars('b')), chars('1'))
);

let dfa = toDfa(sampleRe);

let ast = toAst('nextState', dfa);

let code = generate(ast, {
	comment: true
});

writeFileSync('dist/output.js', code);
