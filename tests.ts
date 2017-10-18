import { Set, ValueObject } from 'immutable';
import { AssertionError } from 'assert';
import * as re from './re';

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

assertEqual(re.chars('xyxxzy').body, Set.of(120, 121, 122));

assertEqual(re.or(), re.EMPTY);
assertEqual(re.or(re.NONE), re.NONE);
assertEqual(re.or(re.EMPTY), re.EMPTY);
assertEqual(re.or(re.EMPTY, re.EMPTY), re.EMPTY);
assertEqual(re.or(re.chars('x'), re.chars('y')), re.chars('xy'));
assertEqual(re.or(re.chars('xy'), re.chars('yz')), re.chars('xyz'));
assertEqual(re.or(re.NONE, re.EMPTY), re.EMPTY);
assertEqual(re.or(re.NOT_NONE, re.EMPTY), re.NOT_NONE);

assertEqual(re.and(), re.NOT_NONE);
assertEqual(re.and(re.NONE), re.NONE);
assertEqual(re.and(re.EMPTY), re.EMPTY);
assertEqual(re.and(re.EMPTY, re.EMPTY), re.EMPTY);
assertEqual(re.and(re.chars('x'), re.chars('y')), re.NONE);
assertEqual(re.and(re.chars('xy'), re.chars('yz')), re.chars('y'));
assertEqual(re.and(re.NONE, re.EMPTY), re.NONE);
assertEqual(re.and(re.NOT_NONE, re.EMPTY), re.EMPTY);

assertEqual(re.concat(re.chars('x'), re.NONE, re.chars('y')), re.NONE);
assertEqual(re.concat(re.chars('x'), re.EMPTY, re.chars('y')), re.concat(re.chars('x'), re.chars('y')));

assertEqual(re.kleene(re.kleene(re.chars('x'))), re.kleene(re.chars('x')));
assertEqual(re.kleene(re.EMPTY), re.EMPTY);
assertEqual(re.kleene(re.NONE), re.EMPTY);

assertEqual(re.not(re.not(re.chars('x'))), re.chars('x'));
