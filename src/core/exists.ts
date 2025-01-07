import {Binder} from "./binder.ts";
import {NamedIdentifier} from "./namedIdentifier.ts";
import {Expression} from "./expression.ts";

export class Exists extends Binder {
    constructor(boundVariable: NamedIdentifier, expression: Expression) {
        super(boundVariable, expression, Exists);
    }
}