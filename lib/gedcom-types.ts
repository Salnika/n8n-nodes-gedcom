export interface ParsedPerson {
	id: string;
	name: string;
	firstName?: string;
	lastName?: string;
	birthDate: string;
	deathDate: string;
	famc: string[];
	fams: string[];
}

export interface ParsedFamily {
	id: string;
	husband?: string;
	wife?: string;
	children: string[];
}

export interface ParsedMeta {
	individuals: number;
	families: number;
	encodingTag: string;
}

export interface ParseResult {
	meta: ParsedMeta;
	persons: ParsedPerson[];
	families: ParsedFamily[];
}

export interface AncestryResult {
	root: string;
	generations: string[][];
	nodes: ParsedPerson[];
	edges: Array<{
		parent: string;
		child: string;
		relation: 'father' | 'mother';
	}>;
}

export interface PersonFilter {
	id?: string;
	name?: string;
	birthDate?: string;
	deathDate?: string;
	fams?: string;
	famc?: string;
}

export interface FamilyFilter {
	id?: string;
	husband?: string;
	wife?: string;
	children?: string;
}