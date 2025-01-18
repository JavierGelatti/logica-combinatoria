import {describe, expect, test} from "vitest";
import {application, equality, forall, identifier} from "../../../src/core/expressions/expression_constructors.ts";
import {FormalSystem} from "../../../src/core/formalSystem.ts";
import {Expression} from "../../../src/core/expressions/expression.ts";

describe("determination of rewrite candidates", () => {
    test("the same expression cannot be used to rewrite itself", () => {
        const system = new FormalSystem();
        let term!: Expression;
        system.addAxiom(forall(
            identifier("x"),
            equality(term = identifier("x"), identifier("A"))
        ));

        const rewriteCandidates = system.rewriteCandidatesMatching(term);

        expect(rewriteCandidates).toEqual([]);
    });

    test("can find exact matches in axioms", () => {
        const system = new FormalSystem();
        let term!: Expression;
        system.addAxiom(equality(term = identifier("A"), identifier("B")));
        let exactMatch!: Expression;
        system.addAxiom(equality(
            exactMatch = identifier("A"),
            identifier("C")
        ));

        const rewriteCandidates = system.rewriteCandidatesMatching(term);

        expect(rewriteCandidates).toEqual([exactMatch]);
    });

    test("can find non-exact matches in axioms", () => {
        const system = new FormalSystem();
        let term!: Expression;
        system.addAxiom(forall(
            identifier("x"),
            equality(term = identifier("x"), identifier("A"))
        ));
        let nonExactMatch1!: Expression, nonExactMatch2!: Expression;
        system.addAxiom(equality(
            nonExactMatch1 = identifier("A"),
            nonExactMatch2 = identifier("C")
        ));

        const rewriteCandidates = system.rewriteCandidatesMatching(term);

        expect(rewriteCandidates).toEqual([nonExactMatch1, nonExactMatch2]);
    });

    test("can find matches in theorems", () => {
        const system = new FormalSystem();
        const forallAxiom = forall(
            identifier("x"),
            equality(identifier("x"), identifier("A"))
        );
        system.addAxiom(forallAxiom);
        let term!: Expression;
        system.addAxiom(equality(term = identifier("B"), identifier("W")));
        system.eliminateForAll(forallAxiom, identifier("B"));

        const rewriteCandidates = system.rewriteCandidatesMatching(term);

        expect(rewriteCandidates.length).toEqual(1);
        expect(rewriteCandidates[0]!.rootExpression()).toEqual(system.theorems()[0]!);
    });

    test("does not include matches that don't bind all variables on the other side of the equation", () => {
        const system = new FormalSystem();
        let term!: Expression;
        system.addAxiom(forall(
            identifier("x"),
            equality(identifier("x"), term = identifier("A"))
        ));
        system.addAxiom(equality(
            identifier("A"),
            identifier("B")
        ));

        const rewriteCandidates = system.rewriteCandidatesMatching(term);

        expect(rewriteCandidates).toEqual([]);
    });

    test("cannot use an expression to rewrite if it's not an equation member", () => {
        const system = new FormalSystem();
        let term!: Expression;
        system.addAxiom(
            equality(
                identifier("A"),
                application(term = identifier("A"), identifier("A"))
            )
        );
        system.addAxiom(equality(identifier("A"), identifier("A")));

        const rewriteCandidates = system.rewriteCandidatesMatching(term);

        expect(rewriteCandidates).toEqual([]);
    });

    test("cannot use an expression to rewrite if it's not part of a proven proposition", () => {
        const system = new FormalSystem();
        let term!: Expression;
        equality(term = identifier("A"), identifier("W"));
        system.addAxiom(equality(identifier("A"), application(identifier("A"), identifier("W"))));

        const rewriteCandidates = system.rewriteCandidatesMatching(term);

        expect(rewriteCandidates).toEqual([]);
    });
});

describe("actual rewriting", () => {
    test("cannot use an expression to rewrite if it's not part of a proven proposition", () => {
        const system = new FormalSystem();
        let source!: Expression, target!: Expression;
        equality(source = identifier("A"), identifier("W"));
        system.addAxiom(equality(identifier("A"), application(target = identifier("A"), identifier("W"))));

        expect(() => system.rewrite(source, target))
            .toThrowError("Cannot rewrite using non-proven expressions");
    });

    test("cannot select a rewrite target if it's not part of a proven proposition", () => {
        const system = new FormalSystem();
        let source!: Expression, target!: Expression;
        system.addAxiom(equality(source = identifier("A"), application(identifier("A"), identifier("W"))));
        equality(target = identifier("A"), identifier("W"));

        expect(() => system.rewrite(source, target))
            .toThrowError("Cannot rewrite using non-proven expressions");
    });

    test("the expression used to rewrite must be an equation member", () => {
        const system = new FormalSystem();
        let source!: Expression, target!: Expression;
        system.addAxiom(forall(identifier("x"), equality(identifier("x"), application(source = identifier("A"), identifier("W")))));
        system.addAxiom(equality(target = identifier("A"), application(identifier("A"), identifier("B"))));

        expect(() => system.rewrite(source, target))
            .toThrowError("Must use an equation member to perform a rewrite");
    });

    test("the rewrite target must be a value", () => {
        const system = new FormalSystem();
        let source!: Expression, target!: Expression;
        system.addAxiom(forall(identifier("x"), equality(source = identifier("x"), application(identifier("A"), identifier("W")))));
        system.addAxiom(target = equality(identifier("A"), application(identifier("A"), identifier("B"))));

        expect(() => system.rewrite(source, target))
            .toThrowError("The rewrite target must be a value");
    });

    test("the same expression cannot be used to rewrite itself", () => {
        const system = new FormalSystem();
        let source!: Expression, target!: Expression;
        system.addAxiom(forall(
            identifier("x"),
            equality(source = identifier("x"), target = identifier("A"))
        ));

        expect(() => system.rewrite(source, target))
            .toThrowError("The rewrite target must be part of a different expression of the source");
    });

    test("cannot rewrite if the target didn't unify with the source", () => {
        const system = new FormalSystem();
        let source!: Expression, target!: Expression;
        system.addAxiom(forall(
            identifier("x"),
            equality(source = identifier("B"), identifier("A"))
        ));
        system.addAxiom(equality(identifier("B"), target = identifier("A")));

        expect(() => system.rewrite(source, target))
            .toThrowError("The rewrite target must fully unify with the source");
    });

    test("can rewrite with the left-hand-side if the expressions unify and fully determine the other side of the equation", () => {
        const system = new FormalSystem();
        let source!: Expression, target!: Expression;
        system.addAxiom(forall(
            identifier("x"),
            equality(source = identifier("x"), identifier("A"))
        ));
        system.addAxiom(equality(target = identifier("B"), identifier("W")));

        const newProof = system.rewrite(source, target);
        expect(newProof.referencedPropositions()).toEqual(system.axioms());
        expect(newProof.source).toEqual(source);
        expect(newProof.target).toEqual(target);
        expect(newProof.provenProposition).toEqual(equality(identifier("A"), identifier("W")))
        expect(system.theorems()).toContain(newProof.provenProposition);
    });

    test("can rewrite with the right-hand-side if the expressions unify and fully determine the other side of the equation", () => {
        const system = new FormalSystem();
        let source!: Expression, target!: Expression;
        system.addAxiom(forall(
            identifier("x"),
            equality(identifier("A"), source = identifier("x"))
        ));
        system.addAxiom(equality(target = identifier("B"), identifier("W")));

        const newProof = system.rewrite(source, target);
        expect(newProof.referencedPropositions()).toEqual(system.axioms());
        expect(newProof.source).toEqual(source);
        expect(newProof.target).toEqual(target);
        expect(newProof.provenProposition).toEqual(equality(identifier("A"), identifier("W")))
        expect(system.theorems()).toContain(newProof.provenProposition);
    });
});