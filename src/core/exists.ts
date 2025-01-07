import {Binder} from "./binder.ts";
import {Identifier} from "./identifier.ts";
import {Expression} from "./expression.ts";

export class Exists extends Binder {
    constructor(boundVariable: Identifier, expression: Expression) {
        super(boundVariable, expression, Exists);
    }
}