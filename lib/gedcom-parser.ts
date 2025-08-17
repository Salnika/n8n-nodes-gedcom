import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { parse as parseGedcom } from 'parse-gedcom';
import { readGedcom } from 'read-gedcom';
import { ParseResult, ParsedPerson, ParsedFamily } from './gedcom-types';
import { GedcomNameParser } from './gedcom-name-parser';

export class GedcomParser {
	static parseGedcomWithFallback(buffer: Buffer, context: IExecuteFunctions): ParseResult {
		let gedcomText: string;
		let encodingTag = 'UTF-8';

		try {
			gedcomText = GedcomParser.detectAndDecodeGedcom(buffer);
		} catch (error) {
			throw new NodeOperationError(context.getNode(), `Failed to decode GEDCOM file: ${(error as Error).message}`);
		}

		try {
			const tree = parseGedcom(gedcomText);
			return GedcomParser.normalizeParseGedcomResult(tree, encodingTag, context);
		} catch (error) {
			try {
				const result = readGedcom(buffer);
				return GedcomParser.normalizeReadGedcomResult(result);
			} catch (fallbackError) {
				throw new NodeOperationError(context.getNode(), `Failed to parse GEDCOM file with both parsers. Primary error: ${(error as Error).message}. Fallback error: ${(fallbackError as Error).message}`);
			}
		}
	}

	private static detectAndDecodeGedcom(buffer: Buffer): string {
		if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
			return buffer.slice(3).toString('utf8');
		}

		if (buffer.length >= 2) {
			if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
				return buffer.slice(2).toString('utf16le');
			}
			if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
				return buffer.slice(2).toString('utf16le');
			}
		}

		return buffer.toString('utf8');
	}

	private static normalizeParseGedcomResult(tree: any, encodingTag: string, context: IExecuteFunctions): ParseResult {
		const persons: ParsedPerson[] = [];
		const families: ParsedFamily[] = [];

		if (!tree || !tree.children || !Array.isArray(tree.children)) {
			throw new NodeOperationError(context.getNode(), 'Invalid GEDCOM structure');
		}

		const headRecord = tree.children.find((record: any) => record.type === 'HEAD');
		if (headRecord && headRecord.children) {
			const charRecord = headRecord.children.find((child: any) => child.type === 'CHAR');
			if (charRecord && charRecord.value) {
				encodingTag = charRecord.value;
			}
		}

		for (const record of tree.children) {
			if (record.type === 'INDI' && record.data && record.data.xref_id) {
				const person = GedcomParser.parseIndividual(record);
				persons.push(person);
			} else if (record.type === 'FAM' && record.data && record.data.xref_id) {
				const family = GedcomParser.parseFamily(record);
				families.push(family);
			}
		}

		return {
			meta: {
				individuals: persons.length,
				families: families.length,
				encodingTag,
			},
			persons,
			families,
		};
	}

	private static normalizeReadGedcomResult(result: any): ParseResult {
		const persons: ParsedPerson[] = [];
		const families: ParsedFamily[] = [];
		let encodingTag = 'UTF-8';

		if (result.head && result.head.characterSet) {
			encodingTag = result.head.characterSet.value || 'UTF-8';
		}

		if (result.individuals) {
			for (const [id, individual] of Object.entries(result.individuals as any)) {
				persons.push(GedcomParser.parseReadGedcomIndividual(id, individual));
			}
		}

		if (result.families) {
			for (const [id, family] of Object.entries(result.families as any)) {
				families.push(GedcomParser.parseReadGedcomFamily(id, family));
			}
		}

		return {
			meta: {
				individuals: persons.length,
				families: families.length,
				encodingTag,
			},
			persons,
			families,
		};
	}

	private static parseIndividual(record: any): ParsedPerson {
		const person: ParsedPerson = {
			id: record.data.xref_id,
			name: '',
			birthDate: '',
			deathDate: '',
			famc: [],
			fams: [],
		};

		if (record.children) {
			for (const child of record.children) {
				switch (child.type) {
					case 'NAME':
						const nameValue = child.value || '';
						const parsedName = GedcomNameParser.parseName(nameValue);
						person.name = parsedName.fullName;
						person.firstName = parsedName.firstName;
						person.lastName = parsedName.lastName;
						break;
					case 'BIRT':
						if (child.children) {
							const dateRecord = child.children.find((grandchild: any) => grandchild.type === 'DATE');
							if (dateRecord) {
								person.birthDate = dateRecord.value || '';
							}
						}
						break;
					case 'DEAT':
						if (child.children) {
							const dateRecord = child.children.find((grandchild: any) => grandchild.type === 'DATE');
							if (dateRecord) {
								person.deathDate = dateRecord.value || '';
							}
						}
						break;
					case 'FAMC':
						if (child.data && child.data.pointer) {
							person.famc.push(child.data.pointer);
						}
						break;
					case 'FAMS':
						if (child.data && child.data.pointer) {
							person.fams.push(child.data.pointer);
						}
						break;
				}
			}
		}

		return person;
	}

	private static parseFamily(record: any): ParsedFamily {
		const family: ParsedFamily = {
			id: record.data.xref_id,
			children: [],
		};

		if (record.children) {
			for (const child of record.children) {
				switch (child.type) {
					case 'HUSB':
						family.husband = child.data && child.data.pointer ? child.data.pointer : child.value;
						break;
					case 'WIFE':
						family.wife = child.data && child.data.pointer ? child.data.pointer : child.value;
						break;
					case 'CHIL':
						if (child.data && child.data.pointer) {
							family.children.push(child.data.pointer);
						} else if (child.value) {
							family.children.push(child.value);
						}
						break;
				}
			}
		}

		return family;
	}

	private static parseReadGedcomIndividual(id: string, individual: any): ParsedPerson {
		const person: ParsedPerson = {
			id: GedcomParser.canonicalizeId(id),
			name: '',
			birthDate: '',
			deathDate: '',
			famc: [],
			fams: [],
		};

		if (individual.name && individual.name.length > 0) {
			const nameRecord = individual.name[0];
			const rawName = `${nameRecord.given || ''} /${nameRecord.surname || ''}/`.trim();
			const parsedName = GedcomNameParser.parseName(rawName);
			person.name = parsedName.fullName;
			person.firstName = parsedName.firstName;
			person.lastName = parsedName.lastName;
		}

		if (individual.birth && individual.birth.date) {
			person.birthDate = individual.birth.date.value || '';
		}

		if (individual.death && individual.death.date) {
			person.deathDate = individual.death.date.value || '';
		}

		if (individual.familyAsChild) {
			person.famc = individual.familyAsChild.map((ref: any) => GedcomParser.canonicalizeId(ref.family));
		}

		if (individual.familyAsSpouse) {
			person.fams = individual.familyAsSpouse.map((ref: any) => GedcomParser.canonicalizeId(ref.family));
		}

		return person;
	}

	private static parseReadGedcomFamily(id: string, family: any): ParsedFamily {
		const parsedFamily: ParsedFamily = {
			id: GedcomParser.canonicalizeId(id),
			children: [],
		};

		if (family.husband) {
			parsedFamily.husband = GedcomParser.canonicalizeId(family.husband.pointer);
		}

		if (family.wife) {
			parsedFamily.wife = GedcomParser.canonicalizeId(family.wife.pointer);
		}

		if (family.children) {
			parsedFamily.children = family.children.map((child: any) => GedcomParser.canonicalizeId(child.pointer));
		}

		return parsedFamily;
	}

	static canonicalizeId(id: string): string {
		if (!id) return '';
		if (id.startsWith('@') && id.endsWith('@')) {
			return id;
		}
		return `@${id}@`;
	}
}