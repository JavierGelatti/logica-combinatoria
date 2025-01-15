import {Identifier} from "./expressions/identifier.ts";
import {Expression} from "./expressions/expression.ts";

export abstract class UnificationResult {
    abstract combinedWith(anotherUnification: UnificationResult): UnificationResult

    abstract combinedWithBindings(bindings: Map<Identifier, Expression>): UnificationResult;

    abstract isSuccessful(): this is UnificationSuccess;
}

export class UnificationFailure extends UnificationResult {
    // noinspection JSUnusedGlobalSymbols
    declare private __unification_failure_brand__: any;

    combinedWith(_anotherUnification: UnificationResult): UnificationResult {
        return this;
    }

    combinedWithBindings(_bindings: Map<Identifier, Expression>) {
        return this;
    }

    isSuccessful(): this is UnificationSuccess {
        return false;
    }
}

export class UnificationSuccess extends UnificationResult {
    constructor(
        public readonly rootExpression: Expression,
        public readonly bindings: Map<Identifier, Expression> = new Map(),
    ) {
        super();

        if (this._variables().some(identifier => identifier.rootExpression() !== rootExpression)) {
            throw new Error("Wrong unification: all of the variables should belong to the same root expression");
        }
    }

    private _variables() {
        return [...this.bindings.keys()];
    }

    combinedWith(anotherUnification: UnificationResult): UnificationResult {
        return anotherUnification.combinedWithBindings(this.bindings);
    }

    combinedWithBindings(bindings: Map<Identifier, Expression>) {
        for (const [variable, value] of bindings) {
            // TODO: verificar si es posible que ocurra que dos variables tengan el mismo nombre,
            //  pero estén ligadas por separado (en ese caso debería fallar).
            if (this.bindings.has(variable) && !this.bindings.get(variable)!.equals(value)) {
                return new UnificationFailure();
            }
        }

        return new UnificationSuccess(this.rootExpression, new Map([...this.bindings.entries(), ...bindings.entries()]));
    }

    isSuccessful(): this is UnificationSuccess {
        return true;
    }

    rewrite() {
        if (this.bindings.size === 0) {
            return this.rootExpression;
        }
    }
}

export function successfulUnification(rootExpression: Expression, ...bindings: [Identifier, Expression][]) {
    return new UnificationSuccess(rootExpression, new Map(bindings));
}

export function unificationFailure() {
    return new UnificationFailure();
}
