import {describe, expect, test} from "vitest";
import {
    application,
    equality,
    forall,
    identifier,
} from "../../../src/core/expressions/expression_constructors.ts";
import {FormalSystem} from "../../../src/core/formalSystem.ts";
import {Identifier} from "../../../src/core/expressions/identifier.ts";
import {ForAll} from "../../../src/core/expressions/forAll.ts";
import { Expression, Truth } from "../../../src/core/expressions/expression.ts";

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

    test("can eliminate a forall during a forall introduction", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("x"), identifier("M"))
        );
        system.addAxiom(axiom1);
        system.startForAllIntroduction(identifier("A"));

        const step = system.eliminateForAll(axiom1, identifier("A"));

        expect(step.provenProposition)
            .toEqual(equality(identifier("A"), identifier("M")));
        expect(system.theorems()).toEqual([]);
    });

    test("can eliminate two successive forall during a forall introduction", () => {
        const system = new FormalSystem();
        const axiom1 = forall(identifier("x"),
            forall(identifier("y"), equality(identifier("x"), identifier("y")))
        );
        system.addAxiom(axiom1);
        system.startForAllIntroduction(identifier("A"));

        const step1 = system.eliminateForAll(axiom1, identifier("A"));
        const step2 = system.eliminateForAll(step1.provenProposition as Expression<Truth> as ForAll, identifier("A"));

        expect(step2.provenProposition)
            .toEqual(equality(identifier("A"), identifier("A")));
        expect(system.theorems()).toEqual([]);
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
        const proof = system.finishCurrentProof();

        expect(proof.referencedPropositions()).toEqual([axiom1]);
        expect(proof.steps.length).toEqual(1);
        expect(proof.provenProposition)
            .toEqual(forall(identifier("A"), equality(identifier("A"), identifier("M"))));
        expect(system.theorems()).toEqual([proof.provenProposition]);
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

    test("cannot introduce a forall if the new identifier is a known object", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("x"), identifier("M"))
        );
        system.addAxiom(axiom1);

        expect(() => system.startForAllIntroduction(identifier("M")))
            .toThrowError("Cannot introduce a forall with a known object identifier");
    });

    test("cannot finish a proof that did not start", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("x"), identifier("M"))
        );
        system.addAxiom(axiom1);

        expect(() => system.finishCurrentProof())
            .toThrowError("Cannot finish non-started proof");
    });

    test("cannot introduce a forall if there were no steps taken, but this doesn't interrupt the current proof", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("x"), identifier("M"))
        );
        system.addAxiom(axiom1);
        system.startForAllIntroduction(identifier("A"));

        expect(() => system.finishCurrentProof()).toThrowError("Cannot finish empty proof");
        expect(system.isWellKnownFreeVariable(identifier("A"))).toBe(true);
    });

    test("can introduce a nested forall", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("x"), identifier("M"))
        );
        system.addAxiom(axiom1);

        system.startForAllIntroduction(identifier("A"));
        system.startForAllIntroduction(identifier("B"));
        system.eliminateForAll(axiom1, identifier("B"));
        system.finishCurrentProof();
        const proof = system.finishCurrentProof();

        expect(proof.referencedPropositions()).toEqual([axiom1]);
        expect(system.theorems())
            .toEqual([forall(identifier("A"), forall(identifier("B"), equality(identifier("B"), identifier("M"))))]);
    });

    test("can reference a previous bound variable while introducing a nested forall", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("x"), identifier("M"))
        );
        system.addAxiom(axiom1);

        system.startForAllIntroduction(identifier("A"));
        system.startForAllIntroduction(identifier("B"));
        system.eliminateForAll(axiom1, identifier("A"));
        system.finishCurrentProof();
        const proof = system.finishCurrentProof();

        expect(proof.referencedPropositions()).toEqual([axiom1]);
        expect(system.theorems())
            .toEqual([forall(identifier("A"), forall(identifier("B"), equality(identifier("A"), identifier("M"))))]);
    });

    test("can reference a previous step while introducing a nested forall", () => {
        const system = new FormalSystem();
        const axiom1 = forall(identifier("x"),
            forall(identifier("y"),
                equality(identifier("x"), identifier("y"))
            )
        );
        system.addAxiom(axiom1);

        system.startForAllIntroduction(identifier("A"));
        const step1 = system.eliminateForAll(axiom1, identifier("A")).provenProposition as Expression<Truth> as ForAll;
        system.startForAllIntroduction(identifier("B"));
        system.eliminateForAll(step1, identifier("B"));
        system.finishCurrentProof();
        const proof = system.finishCurrentProof();

        expect(proof.referencedPropositions()).toEqual([axiom1]);
        expect(system.theorems())
            .toEqual([forall(identifier("A"), forall(identifier("B"), equality(identifier("A"), identifier("B"))))]);
    });

    test("the proven proposition must be a root expression", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("x"), identifier("M"))
        );
        system.addAxiom(axiom1);

        system.startForAllIntroduction(identifier("A"));
        const step = system.eliminateForAll(axiom1, identifier("M"));
        system.finishCurrentProof();

        expect(step.provenProposition.isRootExpression()).toBe(true);
    });

    test("the referenced propositions don't have repeated elements", () => {
        const system = new FormalSystem();
        const axiom1 = forall(identifier("x"),
            forall(identifier("y"),
                equality(identifier("x"), identifier("y"))
            )
        );
        system.addAxiom(axiom1);

        system.startForAllIntroduction(identifier("A"));
        system.eliminateForAll(axiom1, identifier("A"));
        system.eliminateForAll(axiom1, identifier("A"));
        const proof = system.finishCurrentProof();

        expect(proof.referencedPropositions()).toEqual([axiom1]);
    });
});
