import { AddressOrNamespace, TokenOrProgramUpdate } from './utils';
import Address from './Address';
import { U256 } from './U256';
import { TokenDistribution } from './Token';
import { InstructionKinds } from '../types';
export declare class Instruction {
    private kind;
    private value;
    constructor(kind: InstructionKinds, value: CreateInstruction | UpdateInstruction | TransferInstruction | BurnInstruction | LogInstruction);
    toJson(): object;
}
export declare class CreateInstruction {
    private programNamespace;
    private programId;
    private programOwner;
    private totalSupply;
    private initializedSupply;
    private distribution;
    constructor(programNamespace: AddressOrNamespace | null, programId: AddressOrNamespace | null, programOwner: Address | null, totalSupply: string | null, initializedSupply: string | null, distribution: TokenDistribution[]);
    toJson(): object;
}
export declare class UpdateInstruction {
    private updates;
    constructor(updates: TokenOrProgramUpdate[]);
    toJson(): object;
}
export declare class TransferInstruction {
    private token;
    private transferFrom;
    private transferTo;
    private amount;
    private ids;
    constructor(token: Address | null, transferFrom: AddressOrNamespace | null, transferTo: AddressOrNamespace | null, amount: string | null, ids: string[]);
    toJson(): object;
}
export declare class BurnInstruction {
    private caller;
    private programId;
    private token;
    private burnFrom;
    private amount;
    private tokenIds;
    constructor(caller: Address | null, programId: AddressOrNamespace | null, token: Address | null, burnFrom: AddressOrNamespace | null, amount: U256 | null, tokenIds: U256[]);
    toJson(): object;
}
export declare class LogInstruction {
    toJson(): object;
}
