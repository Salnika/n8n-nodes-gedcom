export class NodeOperationError extends Error {
	constructor(node: any, message: string) {
		super(message);
		this.name = 'NodeOperationError';
	}
}

export enum NodeConnectionType {
	Main = 'main'
}

export interface IDataObject {
	[key: string]: any;
}

export interface INodeExecutionData {
	json: IDataObject;
	pairedItem?: {
		item: number;
	};
}

export interface IExecuteFunctions {
	getInputData(): INodeExecutionData[];
	getNodeParameter(name: string, itemIndex?: number): any;
	getNode(): any;
	continueOnFail(): boolean;
	helpers: {
		assertBinaryData(itemIndex: number, propertyName: string): {
			data: string;
		};
		httpRequest(options: any): Promise<any>;
	};
}

export interface INodeType {
	description: INodeTypeDescription;
	execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}

export interface INodeTypeDescription {
	displayName: string;
	name: string;
	icon?: string;
	group: string[];
	version: number;
	description: string;
	defaults: {
		name: string;
	};
	inputs: any[];
	outputs: any[];
	properties: any[];
}