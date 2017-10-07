import { Map } from 'immutable';
import { Re } from './re';
import { Derivatives } from './derivatives';

export function toDfa(re: Re) {
	let regexps = Map<Re, number>().asMutable();

	return Map<number, Map<number, string | null>>().withMutations(dfa => {
		(function getIndex(re: Re): number {
			if (re.type === 'None') {
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
				Map<number, string | null>().withMutations(map => {
					for (let [re, chars] of derivatives.items) {
						map.set(getIndex(re), String.fromCharCode(...chars));
					}

					map.set(getIndex(derivatives.rest), null);
				})
			);

			return index;
		})(re);
	});
}
