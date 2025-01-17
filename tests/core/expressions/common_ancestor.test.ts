import {describe, expect, test} from "vitest";
import {application, identifier} from "../../../src/core/expressions/expression_constructors.ts";
import {Expression} from "../../../src/core/expressions/expression.ts";

describe("common ancestor", () => {
    test("two unrelated expressions have no common ancestor", () => {
        const expression1: Expression = identifier("x");
        const expression2: Expression = identifier("y");

        expect(expression1.commonAncestor(expression2)).toBeUndefined();
    });

    test("an expression is its own common ancestor", () => {
        const expression: Expression = identifier("x");

        expect(expression.commonAncestor(expression)).toBe(expression);
    });

    test("if an expression contains another, the container is their common ancestor", () => {
        let containedExpression!: Expression;
        const containerExpression: Expression = application(
            containedExpression = identifier("x"),
            identifier("y")
        );

        expect(containerExpression.commonAncestor(containedExpression)).toBe(containerExpression);
        expect(containedExpression.commonAncestor(containerExpression)).toBe(containerExpression);
    });

    test("if the expressions don't contain each other, the common ancestor is looked up", () => {
        let expression1!: Expression, expression2!: Expression;
        const containerExpression: Expression = application(
            expression1 = identifier("x"),
            expression2 = identifier("y")
        );

        expect(expression1.commonAncestor(expression2)).toBe(containerExpression);
        expect(expression2.commonAncestor(expression1)).toBe(containerExpression);
    });
});