import { ParseResult, ParsedPerson, ParsedFamily } from './gedcom-types';

export class GedcomGenerator {
	static generateGedcom(data: ParseResult): string {
		const lines: string[] = [];
		
		lines.push('0 HEAD');
		lines.push('1 SOUR n8n-gedcom');
		lines.push('1 VERS 1.0');
		lines.push('1 GEDC');
		lines.push('2 VERS 5.5.1');
		lines.push('2 FORM LINEAGE-LINKED');
		lines.push(`1 CHAR ${data.meta.encodingTag}`);
		lines.push('1 DATE ' + new Date().toISOString().split('T')[0].replace(/-/g, ' '));
		
		for (const person of data.persons) {
			lines.push(...GedcomGenerator.generateIndividual(person));
		}
		
		for (const family of data.families) {
			lines.push(...GedcomGenerator.generateFamily(family));
		}
		
		lines.push('0 TRLR');
		
		return lines.join('\n');
	}

	private static generateIndividual(person: ParsedPerson): string[] {
		const lines: string[] = [];
		
		lines.push(`0 ${person.id} INDI`);
		
		if (person.name) {
			lines.push(`1 NAME ${person.name}`);
		}
		
		if (person.birthDate) {
			lines.push('1 BIRT');
			lines.push(`2 DATE ${person.birthDate}`);
		}
		
		if (person.deathDate) {
			lines.push('1 DEAT');
			lines.push(`2 DATE ${person.deathDate}`);
		}
		
		for (const famcId of person.famc) {
			lines.push(`1 FAMC ${famcId}`);
		}
		
		for (const famsId of person.fams) {
			lines.push(`1 FAMS ${famsId}`);
		}
		
		return lines;
	}

	private static generateFamily(family: ParsedFamily): string[] {
		const lines: string[] = [];
		
		lines.push(`0 ${family.id} FAM`);
		
		if (family.husband) {
			lines.push(`1 HUSB ${family.husband}`);
		}
		
		if (family.wife) {
			lines.push(`1 WIFE ${family.wife}`);
		}
		
		for (const childId of family.children) {
			lines.push(`1 CHIL ${childId}`);
		}
		
		return lines;
	}
}