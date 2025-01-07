import {Binder} from "./binder.ts";
import {Identifier} from "./identifier.ts";
import {Expression} from "./expression.ts";

export class ForAll extends Binder {
    constructor(boundVariable: Identifier, expression: Expression) {
        super(boundVariable, expression, ForAll);
    }
}