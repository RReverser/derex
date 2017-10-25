import { Set, Collection, Seq, Map, Stack, List } from 'immutable';
import { Re, NONE, Class, EMPTY, or, concat, not, and } from './re';

export class Derivatives<T> {
	private constructor(public readonly items: Map<T, Class>, public readonly rest: T) {}

	static fromMutations<T>(f: (add: (chars: Class, re: T) => void) => T): Derivatives<T> {
		let rest: T;
		return new Derivatives(
			Map<T, Class>().withMutations(map => {
				rest = f((chars, re) => map.update(re, Set(), prev => chars.union(prev)));
				map.delete(rest);
			}),
			rest!
		);
	}

	private map<T2>(f: (re: T) => T2): Derivatives<T2> {
		return Derivatives.fromMutations(add => {
			for (let [re, chars] of this.items) {
				add(chars, f(re));
			}
			return f(this.rest);
		});
	}

	static fromRe(re: Re): Derivatives<Re> {
		switch (re.type) {
			case 'Chars': {
				return Derivatives.fromMutations(add => {
					add(re.body, EMPTY);
					return NONE;
				});
			}

			case 'Empty': {
				return new Derivatives(Map(), NONE);
			}

			case 'Kleene': {
				return Derivatives.fromRe(re.body).map(re2 => concat(re2, re));
			}

			case 'Not': {
				return Derivatives.fromRe(re.body).map(not);
			}

			case 'And': {
				return combine(re.body.valueSeq().map(Derivatives.fromRe), and);
			}

			case 'Concat': {
				return combine(
					re.body
						.valueSeq()
						.takeUntil((_, i) => i > 0 && !isNullable(re.body.get(i - 1)!))
						.map((item, i) => {
							let restRe = concat(...re.body.valueSeq().skip(i + 1));
							return Derivatives.fromRe(item).map(re2 => concat(re2, restRe));
						}),
					or
				);
			}

			case 'Or': {
				return combine(re.body.valueSeq().map(Derivatives.fromRe), or);
			}
		}
	}

	static fromVector(re: List<Re>): Derivatives<List<Re>> {
		return combine(re.valueSeq().map(Derivatives.fromRe), (prev = List(), ...regexps) =>
			prev.concat(regexps)
		);
	}
}

export function isNullable(re: Re): boolean {
	switch (re.type) {
		case 'Chars': {
			return false;
		}

		case 'Kleene':
		case 'Empty': {
			return true;
		}

		case 'Concat':
		case 'And': {
			return (re.body as Collection<any, Re>).every(isNullable);
		}

		case 'Or': {
			return re.body.some(isNullable);
		}

		case 'Not': {
			return !isNullable(re.body);
		}
	}
}

function combine<T, T2>(
	derivativesSeq: Seq.Indexed<Derivatives<T>>,
	f: (acc?: T2, ...items: T[]) => T2
): Derivatives<T2> {
	return Derivatives.fromMutations(add => {
		let rest: T2;

		(function recurse(
			derivativesSeq: Stack<Derivatives<T>>,
			inclusive: boolean,
			prevChars: Set<number>,
			acc: T2
		): void {
			if (inclusive && prevChars.isEmpty()) {
				return;
			}

			let first = derivativesSeq.first();

			if (first === undefined) {
				if (inclusive) {
					add(prevChars, acc);
				} else {
					rest = acc;
				}
				return;
			}

			derivativesSeq = derivativesSeq.rest();

			let allChars = Set<number>();

			for (let [subRe, subChars] of first.items) {
				allChars = allChars.union(subChars);

				recurse(
					derivativesSeq,
					true,
					inclusive ? subChars.intersect(prevChars) : subChars.subtract(prevChars),
					f(acc, subRe)
				);
			}

			recurse(
				derivativesSeq,
				inclusive,
				inclusive ? prevChars.subtract(allChars) : prevChars.union(allChars),
				f(acc, first.rest)
			);
		})(derivativesSeq.toStack(), false, Set(), f());

		return rest!;
	});
}
