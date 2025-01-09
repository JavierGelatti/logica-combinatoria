import {describe, expect, test} from "vitest";
import {equality, forall, identifier} from "../../src/core/expression_constructors.ts";
import {Expression} from "../../src/core/expression.ts";

describe("containment", () => {
    test("an expression contains itself", () => {
        const anExpression: Expression = identifier("x");

        expect(anExpression.contains(anExpression)).toBe(true);
    });

    test("two unrelated expressions don't contain each other", () => {
        const anExpression: Expression = identifier("x");
        const anotherExpression: Expression = identifier("y");

        expect(anExpression.contains(anotherExpression)).toBe(false);
    });

    test("an expression contains another if it's one of its parents", () => {
        let containedExpression!: Expression;
        const anExpression: Expression = forall(identifier("x"),
            equality(containedExpression = identifier("x"), identifier("y"))
        );

        expect(anExpression.contains(containedExpression)).toBe(true);
        expect(containedExpression.contains(anExpression)).toBe(false);
    });
});
