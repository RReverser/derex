import { Set, Collection, Seq, Map } from 'immutable';
import { Re, NONE, Class, EMPTY, or, concat, not, and } from './re';

export class Derivatives {
	private constructor(public items: Map<Re, Class>, public rest: Re) {}

	static fromMutations(f: (add: (chars: Class, re: Re) => void) => Re): Derivatives {
		let rest: Re = NONE;
		return new Derivatives(
			Map<Re, Class>().withMutations(map => {
				rest = f((chars, re) => map.update(re, Set(), prev => chars.union(prev)));
				map.delete(rest);
			}),
			rest
		);
	}

	private map(f: (re: Re) => Re): Derivatives {
		return Derivatives.fromMutations(add => {
			for (let [re, chars] of this.items) {
				add(chars, f(re));
			}
			return f(this.rest);
		});
	}

	static fromRe(re: Re): Derivatives {
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
						.map((item, i) =>
							Derivatives.fromRe(item).map(re2 =>
								concat(re2, ...re.body.valueSeq().skip(i + 1))
							)
						),
					or
				);
			}

			case 'Or': {
				return combine(re.body.valueSeq().map(Derivatives.fromRe), or);
			}
		}
	}
}

function isNullable(re: Re): boolean {
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
			return !isNullable(re);
		}
	}
}

function combine(v: Seq.Indexed<Derivatives>, f: (...regexps: Re[]) => Re): Derivatives {
	return Derivatives.fromMutations(add =>
		(function go(
			v: Seq.Indexed<Derivatives>,
			inclusive: boolean,
			chars: Set<number>,
			re: Re
		): Re {
			if (inclusive && chars.isEmpty()) {
				return NONE;
			}

			let first = v.first();

			if (first === undefined) {
				if (inclusive) {
					add(chars, re);
					return NONE;
				} else {
					return re;
				}
			}

			let rest = v.rest();

			let allChars = Set<number>();

			for (let [subRe, subChars] of first.items) {
				allChars = allChars.union(subChars);

				go(
					rest,
					true,
					inclusive ? subChars.intersect(chars) : subChars.subtract(chars),
					f(re, subRe)
				);
			}

			return go(
				rest,
				inclusive,
				inclusive ? chars.subtract(allChars) : chars.union(allChars),
				f(re, first.rest)
			);
		})(v, false, Set(), f())
	);
}
