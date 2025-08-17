import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { ParseResult, ParsedPerson, ParsedFamily, AncestryResult } from './gedcom-types';

export class GedcomAncestry {
	static computeAncestors(parseResult: ParseResult, rootId: string, maxGenerations: number, context: IExecuteFunctions): AncestryResult {
		const canonicalRootId = GedcomAncestry.canonicalizeId(rootId);
		
		const personMap = new Map<string, ParsedPerson>();
		const familyMap = new Map<string, ParsedFamily>();

		for (const person of parseResult.persons) {
			personMap.set(person.id, person);
		}

		for (const family of parseResult.families) {
			familyMap.set(family.id, family);
		}

		if (!personMap.has(canonicalRootId)) {
			throw new NodeOperationError(context.getNode(), `Root person with ID '${rootId}' not found in GEDCOM data`);
		}

		const generations: string[][] = [];
		const visitedPersons = new Set<string>();
		const edges: Array<{parent: string; child: string; relation: 'father' | 'mother'}> = [];

		let currentGeneration = [canonicalRootId];
		visitedPersons.add(canonicalRootId);

		for (let gen = 0; gen < maxGenerations && currentGeneration.length > 0; gen++) {
			generations.push([...currentGeneration]);
			const nextGeneration: string[] = [];

			for (const personId of currentGeneration) {
				const person = personMap.get(personId);
				if (!person) continue;

				for (const familyId of person.famc) {
					const family = familyMap.get(familyId);
					if (!family) continue;

					if (family.husband && !visitedPersons.has(family.husband)) {
						nextGeneration.push(family.husband);
						visitedPersons.add(family.husband);
						edges.push({
							parent: family.husband,
							child: personId,
							relation: 'father',
						});
					}

					if (family.wife && !visitedPersons.has(family.wife)) {
						nextGeneration.push(family.wife);
						visitedPersons.add(family.wife);
						edges.push({
							parent: family.wife,
							child: personId,
							relation: 'mother',
						});
					}
				}
			}

			currentGeneration = nextGeneration;
		}

		const nodes = Array.from(visitedPersons)
			.map(id => personMap.get(id))
			.filter((person): person is ParsedPerson => person !== undefined);

		return {
			root: canonicalRootId,
			generations,
			nodes,
			edges,
		};
	}

	static computeDescendants(parseResult: ParseResult, rootId: string, maxGenerations: number, context: IExecuteFunctions): AncestryResult {
		const canonicalRootId = GedcomAncestry.canonicalizeId(rootId);
		
		const personMap = new Map<string, ParsedPerson>();
		const familyMap = new Map<string, ParsedFamily>();

		for (const person of parseResult.persons) {
			personMap.set(person.id, person);
		}

		for (const family of parseResult.families) {
			familyMap.set(family.id, family);
		}

		if (!personMap.has(canonicalRootId)) {
			throw new NodeOperationError(context.getNode(), `Root person with ID '${rootId}' not found in GEDCOM data`);
		}

		const generations: string[][] = [];
		const visitedPersons = new Set<string>();
		const edges: Array<{parent: string; child: string; relation: 'father' | 'mother'}> = [];

		let currentGeneration = [canonicalRootId];
		visitedPersons.add(canonicalRootId);

		for (let gen = 0; gen < maxGenerations && currentGeneration.length > 0; gen++) {
			generations.push([...currentGeneration]);
			const nextGeneration: string[] = [];

			for (const personId of currentGeneration) {
				const person = personMap.get(personId);
				if (!person) continue;

				for (const familyId of person.fams) {
					const family = familyMap.get(familyId);
					if (!family) continue;

					for (const childId of family.children) {
						if (!visitedPersons.has(childId)) {
							nextGeneration.push(childId);
							visitedPersons.add(childId);
							
							const relation = person.id === family.husband ? 'father' : 'mother';
							edges.push({
								parent: personId,
								child: childId,
								relation,
							});
						}
					}
				}
			}

			currentGeneration = nextGeneration;
		}

		const nodes = Array.from(visitedPersons)
			.map(id => personMap.get(id))
			.filter((person): person is ParsedPerson => person !== undefined);

		return {
			root: canonicalRootId,
			generations,
			nodes,
			edges,
		};
	}

	private static canonicalizeId(id: string): string {
		if (!id) return '';
		if (id.startsWith('@') && id.endsWith('@')) {
			return id;
		}
		return `@${id}@`;
	}
}