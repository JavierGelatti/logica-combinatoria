import {describe, expect, test} from "vitest";
import {
    application,
    equality,
    forall,
    identifier,
} from "../../../src/core/expressions/expression_constructors.ts";
import {FormalSystem} from "../../../src/core/formalSystem.ts";
import {Identifier} from "../../../src/core/expressions/identifier.ts";

describe("forall introduction", () => {
    test("can introduce a forall without using the newly-bound variable", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("x"), identifier("M"))
        );
        system.addAxiom(axiom1);

        system.startForAllIntroduction(identifier("A"));
        system.eliminateForAll(axiom1, identifier("M"));
        system.finishCurrentProof();

        expect(system.theorems())
            .toEqual([forall(identifier("A"), equality(identifier("M"), identifier("M")))]);
    });

    test("can introduce a forall that depends on the newly-bound variable", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("x"), identifier("M"))
        );
        system.addAxiom(axiom1);

        system.startForAllIntroduction(identifier("A"));
        system.eliminateForAll(axiom1, identifier("A"));
        system.finishCurrentProof();

        expect(system.theorems())
            .toEqual([forall(identifier("A"), equality(identifier("A"), identifier("M")))]);
    });

    test("cannot introduce a forall if the new identifier is not a root expression", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("x"), identifier("M"))
        );
        system.addAxiom(axiom1);
        let subexpression!: Identifier;
        application(subexpression = identifier("A"), identifier("A"))

        expect(() => system.startForAllIntroduction(subexpression))
            .toThrowError("Cannot introduce a forall with a non-root identifier");
    });
});
