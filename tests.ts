import { Set, ValueObject } from 'immutable';
import { AssertionError } from 'assert';
import { chars, not, or, and, concat, EMPTY, NONE, NOT_NONE, kleene } from './re';

function assertEqual<T extends ValueObject>(a: T, b: T) {
	if (!a.equals(b)) {
		throw new AssertionError({
			actual: a,
			expected: b,
			operator: '==',
			stackStartFunction: assertEqual
		});
	}
}

assertEqual(chars('xyxxzy').body, Set.of(120, 121, 122));

assertEqual(or(), NONE);
assertEqual(or(NONE), NONE);
assertEqual(or(EMPTY), EMPTY);
assertEqual(or(EMPTY, EMPTY), EMPTY);
assertEqual(or(chars('x'), chars('y')), chars('xy'));
assertEqual(or(chars('xy'), chars('yz')), chars('xyz'));
assertEqual(or(NONE, EMPTY), EMPTY);
assertEqual(or(NOT_NONE, EMPTY), NOT_NONE);

assertEqual(and(), NOT_NONE);
assertEqual(and(NONE), NONE);
assertEqual(and(EMPTY), EMPTY);
assertEqual(and(EMPTY, EMPTY), EMPTY);
assertEqual(and(chars('x'), chars('y')), NONE);
assertEqual(and(chars('xy'), chars('yz')), chars('y'));
assertEqual(and(NONE, EMPTY), NONE);
assertEqual(and(NOT_NONE, EMPTY), EMPTY);

assertEqual(concat(chars('x'), NONE, chars('y')), NONE);
assertEqual(concat(chars('x'), EMPTY, chars('y')), concat(chars('x'), chars('y')));

assertEqual(kleene(kleene(chars('x'))), kleene(chars('x')));
assertEqual(kleene(EMPTY), EMPTY);
assertEqual(kleene(NONE), EMPTY);

assertEqual(not(not(chars('x'))), chars('x'));
