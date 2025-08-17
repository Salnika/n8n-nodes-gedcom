import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Gedcom } from '../../nodes/Gedcom/Gedcom.node';

const mockExecuteFunctions = () => ({
	getInputData: () => [{}],
	getNodeParameter: (name: string) => {
		const params: Record<string, any> = {
			operation: 'parse',
			source: 'binary',
			binaryProperty: 'data',
		};
		return params[name];
	},
	helpers: {
		assertBinaryData: () => ({
			data: readFileSync(join(__dirname, '../fixtures/minimal.ged'), 'base64'),
		}),
	},
	getNode: () => ({ name: 'GEDCOM Test' }),
	continueOnFail: () => false,
});

describe('GEDCOM Parse Operation', () => {
	const gedcom = new Gedcom();

	it('should parse minimal GEDCOM file correctly', async () => {
		const executeFunctions = mockExecuteFunctions();
		const result = await gedcom.execute.call(executeFunctions as any);

		expect(result).toBeDefined();
		expect(result.length).toBe(1);
		expect(result[0]).toBeDefined();
		expect(result[0].length).toBe(1);

		const data = result[0][0].json as any;
		expect(data.meta).toBeDefined();
		expect(data.meta.individuals).toBe(3);
		expect(data.meta.families).toBe(1);
		expect(data.meta.encodingTag).toBe('UTF-8');

		expect(data.persons).toBeDefined();
		expect(data.persons.length).toBe(3);
		expect(data.families).toBeDefined();
		expect(data.families.length).toBe(1);

		const john = data.persons.find((p: any) => p.name === 'Doe/John/');
		expect(john).toBeDefined();
		expect(john.id).toBe('@I1@');
		expect(john.birthDate).toBe('01 JAN 1900');
		expect(john.fams).toEqual(['@F1@']);

		const family = data.families[0];
		expect(family.id).toBe('@F1@');
		expect(family.husband).toBe('@I1@');
		expect(family.wife).toBe('@I2@');
		expect(family.children).toEqual(['@I3@']);
	});

	it('should parse UTF-8 sample file correctly', async () => {
		const executeFunctions = {
			...mockExecuteFunctions(),
			helpers: {
				assertBinaryData: () => ({
					data: readFileSync(join(__dirname, '../fixtures/sample-utf8.ged'), 'base64'),
				}),
			},
		};

		const result = await gedcom.execute.call(executeFunctions as any);
		const data = result[0][0].json as any;

		expect(data.meta.individuals).toBe(5);
		expect(data.meta.families).toBe(2);

		const jean = data.persons.find((p: any) => p.name === 'Martin/Jean-François/');
		expect(jean).toBeDefined();
		expect(jean.birthDate).toBe('15 MAR 1850');
		expect(jean.deathDate).toBe('10 NOV 1920');
	});

	it('should handle empty file gracefully', async () => {
		const executeFunctions = {
			...mockExecuteFunctions(),
			helpers: {
				assertBinaryData: () => ({
					data: Buffer.from('').toString('base64'),
				}),
			},
		};

		await expect(gedcom.execute.call(executeFunctions as any)).rejects.toThrow('GEDCOM file is empty or could not be read');
	});
});