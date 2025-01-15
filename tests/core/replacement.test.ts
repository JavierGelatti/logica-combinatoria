import {describe, expect, test} from "vitest";
import {application, equality, forall, identifier} from "../../src/core/expressions/expression_constructors.ts";
import {Expression} from "../../src/core/expressions/expression.ts";

describe("subexpression replacement", () => {
    test("an expression is replaced by another if it is the expression to replace", () => {
        const anExpression: Expression = identifier("y");

        const result = anExpression.replace(anExpression, identifier("x"));

        expect(result).toEqual(identifier("x"));
    });

    test("the replacement is made by identity, not by equality", () => {
        const anExpression: Expression = identifier("y");

        const result = anExpression.replace(identifier("y"), identifier("x"));

        expect(result).toEqual(identifier("y"));
    });

    test("an atomic expression returns a copy of itself if it is not the expression to replace", () => {
        const anExpression: Expression = identifier("y");

        const result = anExpression.replace(identifier("z"), identifier("x"));

        expect(result).toEqual(anExpression);
        expect(result).not.toBe(anExpression);
    });

    test("a binder returns a copy of itself with the replaced subexpression", () => {
        let subexpressionToReplace!: Expression;
        const anExpression: Expression = forall(
            identifier("x"),
            equality(subexpressionToReplace = identifier("x"), identifier("y"))
        );

        const result = anExpression.replace(subexpressionToReplace, identifier("w"));

        expect(result).toEqual(forall(
            identifier("x"),
            equality(identifier("w"), identifier("y"))
        ));
        expect(result).not.toBe(anExpression);
    });

    test("when replacing the left-hand side of a binary expression, it returns a copy of itself with the replaced subexpression", () => {
        let subexpressionToReplace!: Expression;
        const anExpression: Expression = application(
            subexpressionToReplace = identifier("x"), identifier("y")
        );

        const result = anExpression.replace(subexpressionToReplace, identifier("w"));

        expect(result).toEqual(application(identifier("w"), identifier("y")));
        expect(result).not.toBe(anExpression);
    });

    test("when replacing the right-hand side of a binary expression, it returns a copy of itself with the replaced subexpression", () => {
        let subexpressionToReplace!: Expression;
        const anExpression: Expression = application(
            identifier("x"), subexpressionToReplace = identifier("y")
        );

        const result = anExpression.replace(subexpressionToReplace, identifier("w"));

        expect(result).toEqual(application(identifier("x"), identifier("w")));
        expect(result).not.toBe(anExpression);
    });
});