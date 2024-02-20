import { buildProgramUpdateField, buildUpdateInstruction, } from '../../helpers.js';
import { THIS } from '../../consts.js';
import { AddressOrNamespace, TokenOrProgramUpdate } from '../utils.js';
import { ProgramUpdate } from '../Program.js';
import { Outputs } from '../Outputs.js';
/**
 * Class representing a Program with methods to manage and execute program strategies.
 */
export class Program {
    /**
     * Constructs a new Program instance.
     */
    constructor() {
        this.methodStrategies = {
            update: this.update.bind(this),
        };
    }
    /**
     * Executes a program method strategy based on the given input.
     * @throws Will throw an error if the method name specified in `input` is not found in `methodStrategies`.
     * @returns The result of the strategy execution.
     * @param inputs
     */
    executeMethod(inputs) {
        const { op } = inputs;
        const strategy = this.methodStrategies[op];
        if (strategy) {
            return strategy(inputs);
        }
        throw new Error(`Unknown method: ${op}`);
    }
    /**
     * Initiates the execution of a program method based on the provided input.
     * @returns The result of executing the program method.
     * @param computeInputs
     */
    start(computeInputs) {
        return this.executeMethod(computeInputs);
    }
    /**
     * Updates the program with the provided inputs.
     * @returns The result of updating the program.
     * @param computeInputs
     */
    update(computeInputs) {
        const { transaction } = computeInputs;
        const { transactionInputs } = transaction;
        const programUpdateField = buildProgramUpdateField({
            field: 'metadata',
            value: transactionInputs,
            action: 'extend',
        });
        if (programUpdateField instanceof Error) {
            throw programUpdateField;
        }
        const programUpdates = [programUpdateField];
        const programMetadataUpdateInstruction = buildUpdateInstruction({
            update: new TokenOrProgramUpdate('programUpdate', new ProgramUpdate(new AddressOrNamespace(THIS), programUpdates)),
        });
        return new Outputs(computeInputs, [
            programMetadataUpdateInstruction,
        ]).toJson();
    }
}
