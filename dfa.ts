import { Map, Set } from 'immutable';
import { Re, Class, NONE, EMPTY } from './re';
import { Derivatives, isNullable } from './derivatives';

export type Transitions = Map<number, Class | null>;

export type Dfa = Map<number, Transitions>;

export function toDfa(re: Re): Dfa {
	let regexps = Map<Re, number>().asMutable();

	return Map<number, Transitions>().withMutations(dfa => {
		(function getIndex(re: Re): number {
			if (re.equals(NONE)) {
				return -1;
			}

			if (re.type === 'Empty') {
				return -2;
			}

			let index = regexps.get(re);

			if (index !== undefined) {
				return index;
			}

			index = regexps.size;
			regexps.set(re, index);

			let derivatives = Derivatives.fromRe(re);

			dfa.set(
				index,
				Map<number, Class | null>().withMutations(map => {
					for (let [re, chars] of derivatives.items) {
						map.set(getIndex(re), chars);
					}

					map.set(getIndex(derivatives.rest), null);

					let finalRe = getIndex(isNullable(re) ? EMPTY : NONE);
					let existingClass = map.get(finalRe, Set<number>());

					if (existingClass !== null) {
						map.set(finalRe, existingClass.add(-1));
					}
				})
			);

			return index;
		})(re);
	});
}
