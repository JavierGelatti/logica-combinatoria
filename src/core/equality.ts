import {BinaryExpression} from "./binaryExpression.ts";
import {Expression} from "./expression.ts";

export class Equality extends BinaryExpression {
    constructor(left: Expression, right: Expression) {
        super(left, right, Equality);
    }
}