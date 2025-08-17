import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IDataObject,
	NodeConnectionType,
} from 'n8n-workflow';

import { GedcomParser } from '../../lib/gedcom-parser';
import { GedcomGenerator } from '../../lib/gedcom-generator';
import { GedcomFinder } from '../../lib/gedcom-finder';
import { GedcomAncestry } from '../../lib/gedcom-ancestry';
import { ParseResult, PersonFilter, FamilyFilter } from '../../lib/gedcom-types';

export class Gedcom implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GEDCOM',
		name: 'gedcom',
		icon: 'file:gedcom.svg',
		group: ['transform'],
		version: 1,
		description: 'Complete GEDCOM toolkit for genealogy data processing',
		defaults: {
			name: 'GEDCOM',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Parse',
						value: 'parse',
						description: 'Parse GEDCOM file and extract persons and families',
						action: 'Parse a GEDCOM file',
					},
					{
						name: 'Generate',
						value: 'generate',
						description: 'Generate GEDCOM file from parsed data',
						action: 'Generate a GEDCOM file',
					},
					{
						name: 'Find',
						value: 'find',
						description: 'Find individuals, families, or both with filters',
						action: 'Find records in GEDCOM data',
					},
					{
						name: 'Get Ancestors',
						value: 'ancestors',
						description: 'Get ancestry tree for a specific person',
						action: 'Get ancestry tree',
					},
					{
						name: 'Get Descendants',
						value: 'descendants',
						description: 'Get descendants tree for a specific person',
						action: 'Get descendants tree',
					},
				],
				default: 'parse',
			},
			
			// Parse options
			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Binary Data',
						value: 'binary',
						description: 'Read from binary data property',
					},
					{
						name: 'URL',
						value: 'url',
						description: 'Download from URL',
					},
				],
				default: 'binary',
				displayOptions: {
					show: {
						operation: ['parse'],
					},
				},
			},
			{
				displayName: 'Binary Property',
				name: 'binaryProperty',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: ['parse'],
						source: ['binary'],
					},
				},
				description: 'Name of the binary property containing the GEDCOM file',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['parse'],
						source: ['url'],
					},
				},
				description: 'URL to download the GEDCOM file from',
			},

			// Generate options
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Binary Data',
						value: 'binary',
						description: 'Output as binary data property',
					},
					{
						name: 'Text',
						value: 'text',
						description: 'Output as text in the response',
					},
				],
				default: 'binary',
				displayOptions: {
					show: {
						operation: ['generate'],
					},
				},
			},
			{
				displayName: 'Binary Property Name',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'gedcom',
				required: true,
				displayOptions: {
					show: {
						operation: ['generate'],
						outputFormat: ['binary'],
					},
				},
				description: 'Name of the binary property to store the GEDCOM file',
			},
			{
				displayName: 'Filename',
				name: 'filename',
				type: 'string',
				default: 'output.ged',
				required: true,
				displayOptions: {
					show: {
						operation: ['generate'],
						outputFormat: ['binary'],
					},
				},
				description: 'Filename for the generated GEDCOM file',
			},

			// Find options
			{
				displayName: 'Search Type',
				name: 'searchType',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Individual',
						value: 'individual',
						description: 'Search for individuals only',
					},
					{
						name: 'Family',
						value: 'family',
						description: 'Search for families only',
					},
					{
						name: 'All',
						value: 'all',
						description: 'Search for both individuals and families',
					},
				],
				default: 'individual',
				displayOptions: {
					show: {
						operation: ['find'],
					},
				},
			},
			{
				displayName: 'Include Full Data',
				name: 'includeFullData',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Results Only',
						value: 'results',
						description: 'Return only the search results',
					},
					{
						name: 'All (for Ancestors/Descendants)',
						value: 'all',
						description: 'Include complete GEDCOM data for use with Get Ancestors/Descendants operations',
					},
				],
				default: 'results',
				displayOptions: {
					show: {
						operation: ['find'],
					},
				},
				description: 'Choose whether to include the complete GEDCOM dataset in the output',
			},
			{
				displayName: 'Individual Filters',
				name: 'individualFilters',
				type: 'collection',
				placeholder: 'Add Individual Filter',
				default: {},
				displayOptions: {
					show: {
						operation: ['find'],
						searchType: ['individual', 'all'],
					},
				},
				options: [
					{
						displayName: 'Filter by ID',
						name: 'id',
						type: 'string',
						default: '',
						placeholder: '@I0001@',
						description: 'Filter by individual ID (partial match)',
					},
					{
						displayName: 'Filter by Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: 'John Smith',
						description: 'Filter by individual name (partial match, case insensitive)',
					},
					{
						displayName: 'Filter by Birth Date',
						name: 'birthDate',
						type: 'string',
						default: '',
						placeholder: '1950',
						description: 'Filter by birth date (partial match)',
					},
					{
						displayName: 'Filter by Death Date',
						name: 'deathDate',
						type: 'string',
						default: '',
						placeholder: '2020',
						description: 'Filter by death date (partial match)',
					},
					{
						displayName: 'Filter by Family as Spouse (FAMS)',
						name: 'fams',
						type: 'string',
						default: '',
						placeholder: '@F0001@',
						description: 'Filter by family ID where individual is spouse (partial match)',
					},
					{
						displayName: 'Filter by Family as Child (FAMC)',
						name: 'famc',
						type: 'string',
						default: '',
						placeholder: '@F0001@',
						description: 'Filter by family ID where individual is child (partial match)',
					},
				],
			},
			{
				displayName: 'Family Filters',
				name: 'familyFilters',
				type: 'collection',
				placeholder: 'Add Family Filter',
				default: {},
				displayOptions: {
					show: {
						operation: ['find'],
						searchType: ['family', 'all'],
					},
				},
				options: [
					{
						displayName: 'Filter by ID',
						name: 'id',
						type: 'string',
						default: '',
						placeholder: '@F0001@',
						description: 'Filter by family ID (partial match)',
					},
					{
						displayName: 'Filter by Husband',
						name: 'husband',
						type: 'string',
						default: '',
						placeholder: '@I0001@',
						description: 'Filter by husband ID (partial match)',
					},
					{
						displayName: 'Filter by Wife',
						name: 'wife',
						type: 'string',
						default: '',
						placeholder: '@I0002@',
						description: 'Filter by wife ID (partial match)',
					},
					{
						displayName: 'Filter by Children',
						name: 'children',
						type: 'string',
						default: '',
						placeholder: '@I0003@',
						description: 'Filter by child ID (partial match)',
					},
				],
			},

			// Ancestry/Descendants options
			{
				displayName: 'Root Person ID',
				name: 'rootId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['ancestors', 'descendants'],
					},
				},
				description: 'ID of the person to get ancestors/descendants for (e.g., @I0074@ or I0074)',
			},
			{
				displayName: 'Max Generations',
				name: 'maxGenerations',
				type: 'number',
				default: 9,
				typeOptions: {
					minValue: 1,
					maxValue: 15,
				},
				displayOptions: {
					show: {
						operation: ['ancestors', 'descendants'],
					},
				},
				description: 'Maximum number of generations to retrieve',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				switch (operation) {
					case 'parse':
						const source = this.getNodeParameter('source', i) as string;
						let gedcomBuffer: Buffer;

						if (source === 'binary') {
							const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;
							const binaryData = this.helpers.assertBinaryData(i, binaryProperty);
							gedcomBuffer = Buffer.from(binaryData.data, 'base64');
						} else {
							const url = this.getNodeParameter('url', i) as string;
							const response = await this.helpers.httpRequest({
								method: 'GET',
								url,
								encoding: 'arraybuffer',
								returnFullResponse: true,
							});

							if (response.statusCode !== 200) {
								throw new NodeOperationError(this.getNode(), `Failed to download GEDCOM file from URL: ${response.statusCode}`);
							}

							gedcomBuffer = response.body as Buffer;
						}

						if (!gedcomBuffer || gedcomBuffer.length === 0) {
							throw new NodeOperationError(this.getNode(), 'GEDCOM file is empty or could not be read');
						}

						const parseResult = GedcomParser.parseGedcomWithFallback(gedcomBuffer, this);
						returnData.push({
							json: parseResult as unknown as IDataObject,
							pairedItem: { item: i },
						});
						break;

					case 'generate':
						const outputFormat = this.getNodeParameter('outputFormat', i) as string;
						const inputData = items[i].json as unknown as ParseResult;
						
						if (!inputData.persons || !inputData.families || !inputData.meta) {
							throw new NodeOperationError(this.getNode(), 'Input data must be a valid parsed GEDCOM result with persons, families, and meta properties');
						}

						const gedcomContent = GedcomGenerator.generateGedcom(inputData);

						if (outputFormat === 'binary') {
							const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
							const filename = this.getNodeParameter('filename', i) as string;
							
							const binaryData = Buffer.from(gedcomContent, 'utf8');
							
							returnData.push({
								json: {
									filename,
									size: binaryData.length,
								},
								binary: {
									[binaryPropertyName]: {
										data: binaryData.toString('base64'),
										mimeType: 'text/plain',
										fileName: filename,
										fileExtension: 'ged',
									},
								},
								pairedItem: { item: i },
							});
						} else {
							returnData.push({
								json: {
									gedcom: gedcomContent,
									size: gedcomContent.length,
								},
								pairedItem: { item: i },
							});
						}
						break;

					case 'find':
						const findInputData = items[i].json as unknown as ParseResult;
						
						if (!findInputData.persons || !findInputData.families || !findInputData.meta) {
							throw new NodeOperationError(this.getNode(), 'Input data must be a valid parsed GEDCOM result with persons, families, and meta properties');
						}

						const searchType = this.getNodeParameter('searchType', i) as string;
						const includeFullData = this.getNodeParameter('includeFullData', i) as string;
						
						let individualFilters: PersonFilter = {};
						let familyFilters: FamilyFilter = {};
						
						if (searchType === 'individual' || searchType === 'all') {
							individualFilters = this.getNodeParameter('individualFilters', i) as PersonFilter;
						}
						
						if (searchType === 'family' || searchType === 'all') {
							familyFilters = this.getNodeParameter('familyFilters', i) as FamilyFilter;
						}

						let findResult: any;
						
						// Effectuer la recherche selon le type
						switch (searchType) {
							case 'individual':
								const individuals = GedcomFinder.findIndividuals(findInputData, individualFilters);
								if (includeFullData === 'all') {
									// Inclure toutes les données GEDCOM + résultats de recherche
									findResult = {
										...findInputData, // Copie toute la structure (meta, persons, families)
										searchResults: {
											meta: {
												totalFound: individuals.length,
												totalIndividuals: findInputData.meta.individuals,
												searchType: 'individual',
												filters: individualFilters,
											},
											individuals,
										}
									};
								} else {
									// Résultats seulement
									findResult = {
										meta: {
											totalFound: individuals.length,
											totalIndividuals: findInputData.meta.individuals,
											searchType: 'individual',
											filters: individualFilters,
										},
										individuals,
									};
								}
								break;

							case 'family':
								const families = GedcomFinder.findFamilies(findInputData, familyFilters);
								if (includeFullData === 'all') {
									findResult = {
										...findInputData,
										searchResults: {
											meta: {
												totalFound: families.length,
												totalFamilies: findInputData.meta.families,
												searchType: 'family',
												filters: familyFilters,
											},
											families,
										}
									};
								} else {
									findResult = {
										meta: {
											totalFound: families.length,
											totalFamilies: findInputData.meta.families,
											searchType: 'family',
											filters: familyFilters,
										},
										families,
									};
								}
								break;

							case 'all':
								const personFilter: PersonFilter | undefined = Object.keys(individualFilters).length > 0 ? individualFilters : undefined;
								const familyFilter: FamilyFilter | undefined = Object.keys(familyFilters).length > 0 ? familyFilters : undefined;
								
								const allResults = GedcomFinder.findAll(findInputData, personFilter, familyFilter);
								if (includeFullData === 'all') {
									findResult = {
										...findInputData,
										searchResults: {
											meta: {
												...allResults.meta,
												searchType: 'all',
											},
											filters: {
												individual: personFilter || {},
												family: familyFilter || {},
											},
											persons: allResults.persons,
											families: allResults.families,
										}
									};
								} else {
									findResult = {
										meta: {
											...allResults.meta,
											searchType: 'all',
										},
										filters: {
											individual: personFilter || {},
											family: familyFilter || {},
										},
										persons: allResults.persons,
										families: allResults.families,
									};
								}
								break;

							default:
								throw new NodeOperationError(this.getNode(), `Unknown search type: ${searchType}`);
						}

						returnData.push({
							json: findResult as unknown as IDataObject,
							pairedItem: { item: i },
						});
						break;

					case 'ancestors':
						const ancestorsInputData = items[i].json as unknown as ParseResult;
						
						if (!ancestorsInputData.persons || !ancestorsInputData.families || !ancestorsInputData.meta) {
							throw new NodeOperationError(this.getNode(), 'Input data must be a valid parsed GEDCOM result with persons, families, and meta properties');
						}

						const ancestorsRootId = this.getNodeParameter('rootId', i) as string;
						const ancestorsMaxGenerations = this.getNodeParameter('maxGenerations', i) as number;

						if (!ancestorsRootId) {
							throw new NodeOperationError(this.getNode(), 'Root Person ID is required for ancestors operation');
						}

						const ancestorsResult = GedcomAncestry.computeAncestors(ancestorsInputData, ancestorsRootId, ancestorsMaxGenerations, this);
						returnData.push({
							json: ancestorsResult as unknown as IDataObject,
							pairedItem: { item: i },
						});
						break;

					case 'descendants':
						const descendantsInputData = items[i].json as unknown as ParseResult;
						
						if (!descendantsInputData.persons || !descendantsInputData.families || !descendantsInputData.meta) {
							throw new NodeOperationError(this.getNode(), 'Input data must be a valid parsed GEDCOM result with persons, families, and meta properties');
						}

						const descendantsRootId = this.getNodeParameter('rootId', i) as string;
						const descendantsMaxGenerations = this.getNodeParameter('maxGenerations', i) as number;

						if (!descendantsRootId) {
							throw new NodeOperationError(this.getNode(), 'Root Person ID is required for descendants operation');
						}

						const descendantsResult = GedcomAncestry.computeDescendants(descendantsInputData, descendantsRootId, descendantsMaxGenerations, this);
						returnData.push({
							json: descendantsResult as unknown as IDataObject,
							pairedItem: { item: i },
						});
						break;

					default:
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: { item: i },
					});
				} else {
					throw error;
				}
			}
		}

		return [returnData];
	}
}