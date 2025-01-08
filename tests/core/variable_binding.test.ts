import {describe, expect, test} from "vitest";
import {application, forall, identifier} from "../../src/core/expression_constructors.ts";
import {Identifier} from "../../src/core/identifier.ts";
import {Expression} from "../../src/core/expression.ts";

describe("variable binding", () => {
    test("a variable without context is free", () => {
        const variable = identifier("x");

        expect(variable.isFree()).toBe(true);
    });

    test("the bound variable of a forall is not free", () => {
        let variable!: Identifier;
        forall(
            variable = identifier("x"),
            identifier("x"),
        );

        expect(variable.isFree()).toBe(false);
    });

    test("an occurrence of a different variable in the body of a forall is not free", () => {
        let variable!: Identifier;
        forall(
            identifier("x"),
            variable = identifier("y"),
        );

        expect(variable.isFree()).toBe(true);
    });

    test("an occurrence of the bound variable in the body of a forall is not free", () => {
        let variable!: Identifier;
        forall(
            identifier("x"),
            variable = identifier("x"),
        );

        expect(variable.isFree()).toBe(false);
    });

    test("bound variables in nested foralls are not free", () => {
        let variable!: Identifier;
        forall(
            identifier("x"),
            forall(
                identifier("y"),
                variable = identifier("x")
            )
        );

        expect(variable.isFree()).toBe(false);
    });

    test("free variables in nested foralls are free", () => {
        let variable!: Identifier;
        forall(
            identifier("x"),
            forall(
                identifier("y"),
                variable = identifier("z")
            )
        );

        expect(variable.isFree()).toBe(true);
    });

    test("variables in root binary expressions are free", () => {
        let variable1!: Identifier, variable2!: Identifier;
        application(
            variable1 = identifier("y"),
            variable2 = identifier("y")
        );

        expect(variable1.isFree()).toBe(true);
        expect(variable2.isFree()).toBe(true);
    });

    test("bound variables in nested binary expressions are not free", () => {
        let variable1!: Identifier, variable2!: Identifier;
        forall(
            identifier("x"),
            application(
                variable1 = identifier("x"),
                variable2 = identifier("x")
            )
        );

        expect(variable1.isFree()).toBe(false);
        expect(variable2.isFree()).toBe(false);
    });

    test("free variables in nested binary expressions are free", () => {
        let variable1!: Identifier, variable2!: Identifier;
        forall(
            identifier("x"),
            application(
                variable1 = identifier("y"),
                variable2 = identifier("y")
            )
        );

        expect(variable1.isFree()).toBe(true);
        expect(variable2.isFree()).toBe(true);
    });

    test("the declaration of a bound variable is its binding occurrence", () => {
        let variable1!: Identifier, variable2!: Identifier;
        forall(
            variable1 = identifier("x"),
            forall(identifier("y"), variable2 = identifier("x"))
        );

        expect(variable1.declaration()).toBe(variable1);
        expect(variable2.declaration()).toBe(variable1);
    });

    test("the declaration of a free variable is undefined", () => {
        const freeVariable = identifier("x");

        expect(freeVariable.declaration()).toBeUndefined();
    });

    test("an expression knows the free variables in it", () => {
        let z1!: Identifier, z2!: Identifier;
        const anExpression: Expression = forall(
            identifier("x"),
            application(
                forall(identifier("y"),
                    application(identifier("x"), application(identifier("y"), z1 = identifier("z")))
                ),
                z2 = identifier("z")
            )
        );

        expect(anExpression.freeVariables()).toEqual(new Set([z1, z2]));
    });
});