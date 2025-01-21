import {describe, expect, test} from "vitest";
import {application, equality, forall, identifier} from "../../../src/core/expressions/expression_constructors.ts";
import {FormalSystem} from "../../../src/core/formalSystem.ts";
import {Expression} from "../../../src/core/expressions/expression.ts";
import {Identifier} from "../../../src/core/expressions/identifier.ts";

describe("naming terms", () => {
    test("an expression which is not a value cannot be given a name", () => {
        const system = new FormalSystem();
        system.addAxiom(forall(
            identifier("x"),
            equality(identifier("x"), identifier("A"))
        ));

        expect(() => system.nameTerm(identifier("W"), equality(identifier("A"), identifier("A"))))
            .toThrowError("Cannot name a non-root or non-value expression");
    });

    test("an expression which is not root cannot be given a name", () => {
        const system = new FormalSystem();
        system.addAxiom(forall(
            identifier("x"),
            equality(identifier("x"), identifier("A"))
        ));
        let subexpression!: Expression;
        equality(subexpression = identifier("A"), identifier("A"));

        expect(() => system.nameTerm(identifier("W"), subexpression))
            .toThrowError("Cannot name a non-root or non-value expression");
    });

    test("an identifier which is not root cannot be used as a name", () => {
        const system = new FormalSystem();
        system.addAxiom(forall(
            identifier("x"),
            equality(identifier("x"), identifier("A"))
        ));
        let subexpression!: Identifier;
        equality(subexpression = identifier("W"), identifier("A"));

        expect(() => system.nameTerm(subexpression, identifier("A")))
            .toThrowError("Cannot use a non-root identifier as name");
    });

    test("the named expression must not contain unknown free variables", () => {
        const system = new FormalSystem();
        system.addAxiom(forall(
            identifier("x"),
            equality(identifier("x"), identifier("A"))
        ));

        expect(() => system.nameTerm(identifier("W"), application(identifier("A"), identifier("W"))))
            .toThrowError("Cannot name an expression with unknown free variables");
    });

    test("the chosen name must not be a known object", () => {
        const system = new FormalSystem();
        system.addAxiom(forall(
            identifier("x"),
            equality(identifier("x"), identifier("A"))
        ));

        expect(() => system.nameTerm(identifier("A"), application(identifier("A"), identifier("A"))))
            .toThrowError("The name A is already taken");
    });

    test("a valid value expression can be given a name", () => {
        const system = new FormalSystem();
        system.addAxiom(forall(
            identifier("x"),
            equality(identifier("x"), identifier("A"))
        ));

        const proof = system.nameTerm(identifier("W"), application(identifier("A"), identifier("A")));

        expect(proof.referencedPropositions()).toEqual([]);
        expect(proof.newBoundVariable).toEqual(identifier("W"));
        expect(proof.provenProposition).toEqual(equality(identifier("W"), application(identifier("A"), identifier("A"))));
        expect(system.objectsInContext()).toContainEqual(identifier("W"));
        expect(system.identifierOf(proof.provenProposition)).toEqual(['T', 1, 1]);
    });
});
