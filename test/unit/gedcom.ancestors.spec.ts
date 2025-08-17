import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Gedcom } from '../../nodes/Gedcom/Gedcom.node';

const mockExecuteFunctionsForAncestors = (rootId: string, maxGenerations = 9) => ({
	getInputData: () => [{}],
	getNodeParameter: (name: string) => {
		const params: Record<string, any> = {
			operation: 'ancestors',
			source: 'binary',
			binaryProperty: 'data',
			rootId,
			maxGenerations,
		};
		return params[name];
	},
	helpers: {
		assertBinaryData: () => ({
			data: readFileSync(join(__dirname, '../fixtures/sample-utf8.ged'), 'base64'),
		}),
	},
	getNode: () => ({ name: 'GEDCOM Test' }),
	continueOnFail: () => false,
});

describe('GEDCOM Ancestors Operation', () => {
	const gedcom = new Gedcom();

	it('should compute ancestors for François (I5) correctly', async () => {
		const executeFunctions = mockExecuteFunctionsForAncestors('@I5@', 3);
		const result = await gedcom.execute.call(executeFunctions as any);

		expect(result).toBeDefined();
		expect(result.length).toBe(1);

		const data = result[0][0].json as any;
		expect(data.root).toBe('@I5@');
		expect(data.generations).toBeDefined();
		expect(data.generations.length).toBeGreaterThan(0);

		expect(data.generations[0]).toEqual(['@I5@']);
		expect(data.generations[1]).toEqual(['@I3@', '@I4@']);
		expect(data.generations[2]).toEqual(['@I1@', '@I2@']);

		expect(data.edges).toBeDefined();
		expect(data.edges.length).toBe(4);

		const fatherEdges = data.edges.filter((e: any) => e.relation === 'father');
		const motherEdges = data.edges.filter((e: any) => e.relation === 'mother');
		expect(fatherEdges.length).toBe(2);
		expect(motherEdges.length).toBe(2);

		expect(data.nodes).toBeDefined();
		expect(data.nodes.length).toBe(5);
	});

	it('should handle rootId without @ symbols', async () => {
		const executeFunctions = mockExecuteFunctionsForAncestors('I5', 2);
		const result = await gedcom.execute.call(executeFunctions as any);

		const data = result[0][0].json as any;
		expect(data.root).toBe('@I5@');
		expect(data.generations[0]).toEqual(['@I5@']);
	});

	it('should limit generations correctly', async () => {
		const executeFunctions = mockExecuteFunctionsForAncestors('@I5@', 1);
		const result = await gedcom.execute.call(executeFunctions as any);

		const data = result[0][0].json as any;
		expect(data.generations.length).toBe(1);
		expect(data.generations[0]).toEqual(['@I5@']);
	});

	it('should handle non-existent root person', async () => {
		const executeFunctions = mockExecuteFunctionsForAncestors('@I999@');
		
		await expect(gedcom.execute.call(executeFunctions as any)).rejects.toThrow("Root person with ID '@I999@' not found in GEDCOM data");
	});

	it('should handle person with no parents', async () => {
		const executeFunctions = mockExecuteFunctionsForAncestors('@I1@', 3);
		const result = await gedcom.execute.call(executeFunctions as any);

		const data = result[0][0].json as any;
		expect(data.generations.length).toBe(1);
		expect(data.generations[0]).toEqual(['@I1@']);
		expect(data.edges.length).toBe(0);
		expect(data.nodes.length).toBe(1);
	});

	it('should handle missing rootId parameter', async () => {
		const executeFunctions = {
			...mockExecuteFunctionsForAncestors('', 3),
			getNodeParameter: (name: string) => {
				const params: Record<string, any> = {
					operation: 'ancestors',
					source: 'binary',
					binaryProperty: 'data',
					rootId: '',
					maxGenerations: 3,
				};
				return params[name];
			},
		};

		await expect(gedcom.execute.call(executeFunctions as any)).rejects.toThrow('Root Person ID is required for ancestors operation');
	});
});