import {describe, expect, test} from "vitest";
import {
    application,
    equality,
    forall,
    identifier,
} from "../../../src/core/expressions/expression_constructors.ts";
import {FormalSystem} from "../../../src/core/formalSystem.ts";
import {ForAll} from "../../../src/core/expressions/forAll.ts";

describe("proposition identifiers", () => {
    test("are generated for axioms", () => {
        const system = new FormalSystem();
        const axiom1 = equality(identifier("A"), identifier("B"));
        const axiom2 = equality(identifier("B"), identifier("A"));
        system.addAxiom(axiom1);
        system.addAxiom(axiom2);

        expect(system.identifierOf(axiom1)).toEqual(['A', 1]);
        expect(system.identifierOf(axiom2)).toEqual(['A', 2]);
    });

    test("are generated for theorems", () => {
        const system = new FormalSystem();
        const axiom1 = forall(identifier("x"), equality(identifier("x"), application(identifier("A"), identifier("B"))));
        system.addAxiom(axiom1);
        system.eliminateForAll(axiom1, identifier("A"));
        system.eliminateForAll(axiom1, identifier("B"));

        const theoremIdentifiers = system.theorems()
            .map(theorem => system.identifierOf(theorem));

        expect(theoremIdentifiers).toEqual([['T', 1], ['T', 2]]);
    });

    test("are not generated for other expressions", () => {
        const system = new FormalSystem();

        expect(system.identifierOf(identifier("x")))
            .toBeUndefined();
    });

    test("are generated for proof steps", () => {
        const system = new FormalSystem();
        const axiom1 = forall(identifier("x"),
            forall(identifier("y"),
                equality(identifier("x"), identifier("y"))
            )
        );
        system.addAxiom(axiom1);

        system.startForAllIntroduction(identifier("A"));
        const step1 = system.eliminateForAll(axiom1, identifier("A")).provenProposition;
        const step2 = system.eliminateForAll(axiom1, identifier("A")).provenProposition;
        system.startForAllIntroduction(identifier("B"));
        const step3 = system.eliminateForAll(step1 as unknown as ForAll, identifier("B")).provenProposition;

        expect(system.identifierOf(step1)).toEqual(['T', 1, 1]);
        expect(system.identifierOf(step2)).toEqual(['T', 1, 2]);
        expect(system.identifierOf(step3)).toEqual(['T', 1, 2, 1]);
    });

});