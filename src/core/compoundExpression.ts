import {Expression} from "./expression.ts";
import {Identifier} from "./identifier.ts";

export abstract class CompoundExpression extends Expression {
    protected readonly subexpressions: Expression[];

    protected constructor(...subexpressions: Expression[]) {
        super();
        this.subexpressions = subexpressions;
        this.subexpressions.forEach(subexpression => {
            subexpression.insertedInto(this);
        });
    }

    isFreeVariable(variable: Identifier): boolean {
        return this._parent === undefined || this._parent.isFreeVariable(variable);
    }
}