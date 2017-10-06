import { Set, Record, List, Collection, Seq, Map } from 'immutable';

interface TypedBody<S extends string, B> {
	type: S;
	body: B;
}

interface TypedRecord<S extends string, B>
	extends Record<TypedBody<S, B>>,
		Readonly<TypedBody<S, B>> {}

function factory<R extends TypedRecord<string, any>>(type: R['type']) {
	const inner = Record({ type, body: undefined });
	return (body: R['body']) => inner({ body }) as R;
}

export type Re = Chars | None | Empty | Concat | Kleene | Or | And | Not;
type Class = Set<number>;

export interface Chars extends TypedRecord<'Chars', Class> {}
const Chars = factory<Chars>('Chars');

export interface None extends Record<{ type: 'None' }>, Readonly<{ type: 'None' }> {}
export const NONE: None = Record({ type: 'None' as 'None' })();

export function chars(allowedChars: string) {
	return Chars(
		Set().withMutations(set => {
			for (let i = 0; i < allowedChars.length; i++) {
				set.add(allowedChars.charCodeAt(i));
			}
		})
	);
}

export interface Empty extends Record<{ type: 'Empty' }>, Readonly<{ type: 'Empty' }> {}
export const EMPTY: Empty = Record({ type: 'Empty' as 'Empty' })();

export interface Concat extends TypedRecord<'Concat', List<Chars | Kleene | Or | And | Not>> {}
const Concat = factory<Concat>('Concat');

export function concat(...regexps: Re[]) {
	let newList = List<Chars | Kleene | Or | And | Not>();

	for (let re of regexps) {
		switch (re.type) {
			case 'None': {
				return NONE;
			}
			case 'Empty': {
				break;
			}
			case 'Concat': {
				newList = newList.concat(re.body);
				break;
			}
			default: {
				newList = newList.push(re);
				break;
			}
		}
	}

	if (newList.size === 0) {
		return NONE;
	}

	if (newList.size === 1) {
		return newList.first()!;
	}

	return Concat(newList);
}

export interface Kleene extends TypedRecord<'Kleene', Chars | Concat | Or | And | Not> {}
const Kleene = factory<Kleene>('Kleene');

export function kleene(body: Re) {
	if (body.type === 'Empty' || body.type === 'Kleene') return body;
	if (body.type === 'None') return EMPTY;
	return Kleene(body);
}

export interface Or extends TypedRecord<'Or', Set<Chars | Empty | Concat | Kleene | And | Not>> {}
const Or = factory<Or>('Or');

export function or(...regexps: Re[]) {
	let newSet = Set<Chars | Empty | Concat | Kleene | And | Not>();
	let chars = Set<number>();

	for (let re of regexps) {
		switch (re.type) {
			case 'None': {
				break;
			}
			case 'Chars': {
				chars = chars.union(re.body);
				break;
			}
			case 'Or': {
				newSet = newSet.union(re.body);
				break;
			}
			default: {
				if (re.equals(NOT_NONE)) {
					return NOT_NONE;
				}
				newSet = newSet.add(re);
				break;
			}
		}
	}

	if (!chars.isEmpty()) {
		newSet = newSet.add(Chars(chars));
	}

	if (newSet.size === 0) {
		return NONE;
	}

	if (newSet.size === 1) {
		return newSet.first()!;
	}

	return Or(newSet);
}

export interface And extends TypedRecord<'And', Set<Chars | Empty | Concat | Kleene | Or | Not>> {}
const And = factory<And>('And');

export function and(...regexps: Re[]) {
	let newSet = Set<Chars | Empty | Concat | Kleene | Or | Not>();
	let chars = Set<number>();

	for (let re of regexps) {
		switch (re.type) {
			case 'None': {
				return NONE;
			}
			case 'Chars': {
				chars = chars.intersect(re.body);
				break;
			}
			case 'And': {
				newSet = newSet.union(re.body);
				break;
			}
			default: {
				if (!re.equals(NOT_NONE)) {
					newSet = newSet.add(re);
				}
				break;
			}
		}
	}

	if (!chars.isEmpty()) {
		newSet = newSet.add(Chars(chars));
	}

	if (newSet.size === 0) {
		return NONE;
	}

	if (newSet.size === 1) {
		return newSet.first()!;
	}

	return And(newSet);
}

export interface Not
	extends TypedRecord<'Not', None | Chars | Empty | Concat | Kleene | Or | And> {}
const Not = factory<Not>('Not');

export function not(body: Re) {
	if (body.type === 'Not') return body.body;
	return Not(body);
}

export const NOT_NONE = Not(NONE);

export class Derivatives {
	constructor(public items = Map<Re, Class>(), public rest: Re = NONE) {}

	withMutations(f: (add: (chars: Class, re: Re) => void) => Re) {
		this.items = Map<Re, Class>().withMutations(map => {
			this.rest = f((chars, re) => map.update(re, Set(), prev => chars.union(prev)));
			map.delete(this.rest);
		});
		return this;
	}

	map(f: (re: Re) => Re) {
		return new Derivatives().withMutations(add => {
			for (let [re, chars] of this.items) {
				add(chars, f(re));
			}
			return f(this.rest);
		});
	}
}

function isNullable(re: Re): boolean {
	switch (re.type) {
		case 'None':
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

function combine(
	v: Seq.Indexed<Derivatives>,
	initial: Re,
	f: (prev: Re, cur: Re) => Re
): Derivatives {
	return new Derivatives().withMutations(add =>
		(function go(
			v: Seq.Indexed<Derivatives>,
			inclusive: boolean,
			chars: Set<number>,
			re: Re
		): Re {
			if (inclusive && chars.isEmpty()) {
				return NONE;
			}

			if (v.isEmpty()) {
				if (inclusive) {
					add(chars, re);
					return NONE;
				} else {
					return re;
				}
			}

			let first = v.first()!;
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
		})(v, false, Set(), initial)
	);
}

export function getDerivatives(re: Re): Derivatives {
	switch (re.type) {
		case 'Chars': {
			return new Derivatives(Map.of(EMPTY, re.body), NONE);
		}

		case 'None':
		case 'Empty': {
			return new Derivatives();
		}

		case 'Kleene': {
			return getDerivatives(re.body).map(re2 => concat(re2, re));
		}

		case 'Not': {
			return getDerivatives(re.body).map(not);
		}

		case 'And': {
			return combine(re.body.valueSeq().map(getDerivatives), NOT_NONE, and);
		}

		case 'Concat': {
			return combine(
				re.body
					.valueSeq()
					.takeUntil((_, i) => i > 0 && !isNullable(re.body.get(i - 1)!))
					.map((item, i) =>
						getDerivatives(item).map(re2 =>
							concat(...re.body.valueSeq().skip(i + 1), re2)
						)
					),
				NONE,
				or
			);
		}

		case 'Or': {
			return combine(re.body.valueSeq().map(getDerivatives), NONE, or);
		}
	}
}

export function toDfa(re: Re) {
	let regexps = List<Re>().asMutable();

	return Map<number, Map<number, string | null>>().withMutations(dfa => {
		(function getIndex(re: Re): number {
			if (re.type === 'None') {
				return -1;
			}

			if (re.type === 'Empty') {
				return -2;
			}

			let index = regexps.indexOf(re);

			if (index >= 0) {
				return index;
			}

			index = regexps.size;
			regexps.push(re);

			let derivatives = getDerivatives(re);

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

let sampleRe = or(
	or(concat(chars('a'), chars('bc'), chars('1')), concat(chars('a'), chars('bd'), chars('1'))),
	concat(chars('a'), kleene(chars('b')), chars('1'))
);

console.log(toDfa(sampleRe));
