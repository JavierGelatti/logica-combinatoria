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
    test("if the newly-bound variable is not used, the proposition is proven as-is (wihout adding a for all)", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("x"), identifier("M"))
        );
        system.addAxiom(axiom1);

        system.newArbitraryVariables(identifier("A"));
        system.eliminateForAll(axiom1, identifier("M"));
        system.finishCurrentProof();

        expect(system.theorems())
            .toEqual([equality(identifier("M"), identifier("M"))]);
    });

    test("can eliminate a forall during a forall introduction", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("x"), identifier("M"))
        );
        system.addAxiom(axiom1);
        system.newArbitraryVariables(identifier("A"));

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
        system.newArbitraryVariables(identifier("A"));

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

        system.newArbitraryVariables(identifier("A"));
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

        expect(() => system.newArbitraryVariables(subexpression))
            .toThrowError("Cannot introduce a forall with a non-root identifier");
    });

    test("cannot introduce a forall if the new identifier is a known object", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("x"), identifier("M"))
        );
        system.addAxiom(axiom1);

        expect(() => system.newArbitraryVariables(identifier("M")))
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
        system.newArbitraryVariables(identifier("A"));

        expect(() => system.finishCurrentProof()).toThrowError("Cannot finish empty proof");
        expect(system.isKnownObject(identifier("A"))).toBe(true);
    });

    test("can introduce many new variables", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("x"), identifier("M"))
        );
        system.addAxiom(axiom1);

        system.newArbitraryVariables(identifier("A"));
        system.newArbitraryVariables(identifier("B"));
        system.eliminateForAll(axiom1, identifier("B"));
        const proof = system.finishCurrentProof();

        expect(proof.referencedPropositions()).toEqual([axiom1]);
        expect(system.theorems())
            .toEqual([forall(identifier("B"), equality(identifier("B"), identifier("M")))]);
    });

    test("can reference a previous bound variable while introducing a forall", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("x"), identifier("M"))
        );
        system.addAxiom(axiom1);

        system.newArbitraryVariables(identifier("A"));
        system.newArbitraryVariables(identifier("B"));
        system.eliminateForAll(axiom1, identifier("A"));
        const proof = system.finishCurrentProof();

        expect(proof.referencedPropositions()).toEqual([axiom1]);
        expect(system.theorems())
            .toEqual([forall(identifier("A"), equality(identifier("A"), identifier("M")))]);
    });

    test("can reference a previous step while introducing a nested forall", () => {
        const system = new FormalSystem();
        const axiom1 = forall(identifier("x"),
            forall(identifier("y"),
                equality(identifier("x"), identifier("y"))
            )
        );
        system.addAxiom(axiom1);

        system.newArbitraryVariables(identifier("A"));
        const step1 = system.eliminateForAll(axiom1, identifier("A")).provenProposition as Expression<Truth> as ForAll;
        system.newArbitraryVariables(identifier("B"));
        system.eliminateForAll(step1, identifier("B"));
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

        system.newArbitraryVariables(identifier("A"));
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

        system.newArbitraryVariables(identifier("A"));
        system.eliminateForAll(axiom1, identifier("A"));
        system.eliminateForAll(axiom1, identifier("A"));
        const proof = system.finishCurrentProof();

        expect(proof.referencedPropositions()).toEqual([axiom1]);
    });

    test("can introduce many variables at once", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("x"), identifier("M"))
        );
        system.addAxiom(axiom1);

        system.newArbitraryVariables(identifier("A"), identifier("B"));
        system.eliminateForAll(axiom1, identifier("A"));
        system.finishCurrentProof();

        expect(system.theorems())
            .toEqual([forall(identifier("A"), equality(identifier("A"), identifier("M")))]);
    });

    test("each theorem knows its own variables", () => {
        const system = new FormalSystem();
        const axiom1 = forall(
            identifier("x"),
            equality(identifier("x"), identifier("M"))
        );
        system.addAxiom(axiom1);

        system.newArbitraryVariables(identifier("A"), identifier("B"));
        expect(system.arbitraryObjectsInCurrentOngoingProof())
            .toEqual([identifier("A"), identifier("B")]);

        system.startNewProof();
        system.newArbitraryVariables(identifier("C"));
        expect(system.arbitraryObjectsInCurrentOngoingProof())
            .toEqual([identifier("C")]);
    });
});
