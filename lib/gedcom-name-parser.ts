export class GedcomNameParser {
	static parseName(nameValue: string): { fullName: string; firstName?: string; lastName?: string } {
		if (!nameValue) {
			return { fullName: '' };
		}

		// Pattern pour trouver le nom de famille entre / /
		const lastNamePattern = /\/([^\/]+)\//;
		const lastNameMatch = nameValue.match(lastNamePattern);
		
		let firstName = '';
		let lastName = '';
		
		if (lastNameMatch && lastNameMatch.index !== undefined) {
			// Il y a un nom de famille entre / /
			lastName = lastNameMatch[1].trim();
			
			// Extraire la partie avant le nom de famille
			const beforeLastName = nameValue.substring(0, lastNameMatch.index).trim();
			
			// Extraire la partie après le nom de famille (suffixe)
			const afterLastName = nameValue.substring(lastNameMatch.index + lastNameMatch[0].length).trim();
			
			// Combiner prénom et suffixe
			firstName = [beforeLastName, afterLastName].filter(part => part).join(' ');
		} else {
			// Pas de nom de famille entre / /, traiter tout comme prénom
			firstName = nameValue.trim();
		}
		
		// Reconstituer le nom complet sans les /
		let fullName = '';
		if (firstName && lastName) {
			fullName = `${firstName} ${lastName}`;
		} else if (firstName) {
			fullName = firstName;
		} else if (lastName) {
			fullName = lastName;
		}
		
		return {
			fullName: fullName || nameValue,
			firstName: firstName || undefined,
			lastName: lastName || undefined,
		};
	}
}