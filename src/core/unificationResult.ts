import {Identifier} from "./expressions/identifier.ts";
import {Expression} from "./expressions/expression.ts";

export abstract class UnificationResult {
    abstract combinedWith(anotherUnification: UnificationResult): UnificationResult

    abstract combinedWithBindings(bindings: Map<Identifier, Expression>): UnificationResult;

    abstract isSuccessful(): this is UnificationSuccess;
}

class UnificationFailure extends UnificationResult {
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

class UnificationSuccess extends UnificationResult {
    constructor(
        public readonly bindings: Map<Identifier, Expression> = new Map(),
    ) {
        super();
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

        return new UnificationSuccess(new Map([...this.bindings.entries(), ...bindings.entries()]));
    }

    isSuccessful(): this is UnificationSuccess {
        return true;
    }
}

export function successfulUnification(...bindings: [Identifier, Expression][]) {
    return new UnificationSuccess(new Map(bindings));
}

export function unificationFailure() {
    return new UnificationFailure();
}
