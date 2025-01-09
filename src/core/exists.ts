import {Binder} from "./binder.ts";
import {Identifier} from "./identifier.ts";
import {Expression, Truth} from "./expression.ts";

export class Exists extends Binder {
    constructor(boundVariable: Identifier, expression: Expression<Truth>) {
        super(boundVariable, expression, Exists);
    }
}