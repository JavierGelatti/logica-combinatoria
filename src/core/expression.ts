export abstract class Expression {
    equals(anotherObject: unknown): boolean {
        if (!(anotherObject instanceof this.constructor)) return false;

        return this._equals(anotherObject as this);
    }

    protected abstract _equals(anotherObject: this): boolean;

    public abstract replace(subExpressionToReplace: Expression, newExpression: Expression): Expression;
}