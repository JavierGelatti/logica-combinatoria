import {Binder} from "./binder.ts";
import {Identifier} from "./identifier.ts";
import {Expression, Truth} from "./expression.ts";

export class ForAll extends Binder {
    constructor(boundVariable: Identifier, expression: Expression<Truth>) {
        super(boundVariable, expression, ForAll);
    }

    toString(): string {
        return `(∀${this.boundVariable.toString()}) ${this.body.toString()}`;
    }
}