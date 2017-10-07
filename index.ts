import { or, concat, chars, kleene } from './re';
import { toDfa } from './dfa';

let sampleRe = or(
	or(concat(chars('a'), chars('bc'), chars('1')), concat(chars('a'), chars('bd'), chars('1'))),
	concat(chars('a'), kleene(chars('b')), chars('1'))
);

console.log(toDfa(sampleRe));
