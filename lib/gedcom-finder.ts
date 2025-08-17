import { ParseResult, ParsedPerson, ParsedFamily, PersonFilter, FamilyFilter } from './gedcom-types';

export class GedcomFinder {
	static findIndividuals(data: ParseResult, filter: PersonFilter): ParsedPerson[] {
		return data.persons.filter(person => {
			if (filter.id && !person.id.includes(filter.id)) return false;
			if (filter.name && !person.name.toLowerCase().includes(filter.name.toLowerCase())) return false;
			if (filter.birthDate && !person.birthDate.includes(filter.birthDate)) return false;
			if (filter.deathDate && !person.deathDate.includes(filter.deathDate)) return false;
			if (filter.fams && !person.fams.some(id => id.includes(filter.fams!))) return false;
			if (filter.famc && !person.famc.some(id => id.includes(filter.famc!))) return false;
			return true;
		});
	}

	static findFamilies(data: ParseResult, filter: FamilyFilter): ParsedFamily[] {
		return data.families.filter(family => {
			if (filter.id && !family.id.includes(filter.id)) return false;
			if (filter.husband && (!family.husband || !family.husband.includes(filter.husband))) return false;
			if (filter.wife && (!family.wife || !family.wife.includes(filter.wife))) return false;
			if (filter.children && !family.children.some(id => id.includes(filter.children!))) return false;
			return true;
		});
	}

	static findAll(data: ParseResult, personFilter?: PersonFilter, familyFilter?: FamilyFilter) {
		const individuals = personFilter ? GedcomFinder.findIndividuals(data, personFilter) : data.persons;
		const families = familyFilter ? GedcomFinder.findFamilies(data, familyFilter) : data.families;
		
		return {
			meta: {
				individuals: individuals.length,
				families: families.length,
				totalIndividuals: data.meta.individuals,
				totalFamilies: data.meta.families,
				encodingTag: data.meta.encodingTag,
			},
			persons: individuals,
			families: families,
		};
	}
}