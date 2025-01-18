import {BinaryExpression} from "./binaryExpression.ts";
import {Expression, Truth, truthType, Value} from "./expression.ts";

export class Equality extends BinaryExpression<Value, Truth> {
    protected _type: Truth = truthType;

    constructor(left: Expression<Value>, right: Expression<Value>) {
        super(left, right, Equality);
    }

    toString(): string {
        return `${this.left} = ${this.right}`;
    }

    isEquality(): this is Equality {
        return true;
    }
}