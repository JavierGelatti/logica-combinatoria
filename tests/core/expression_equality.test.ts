import {describe, expect, test} from "vitest";
import {application, exists, forall, identifier} from "../../src/core/expression_constructors.ts";

describe("expression equality", () => {
    test("a free variable is only equal to another free variable with the same name", () => {
        const aVariable = identifier("A");
        const anotherVariable = identifier("B");
        const yetAnotherVariable = identifier("A");

        expect(aVariable.equals(aVariable)).toBe(true);
        expect(aVariable.equals(anotherVariable)).toBe(false);
        expect(aVariable.equals(yetAnotherVariable)).toBe(true);
        expect(aVariable.equals("A")).toBe(false);
    });

    test("an application is equal to another if both components are equal", () => {
        const application1 = application(identifier("A"), identifier("B"));
        const application2 = application(identifier("B"), identifier("B"));
        const application3 = application(identifier("A"), identifier("A"));
        const application4 = application(identifier("A"), identifier("B"));

        expect(application1.equals(application1)).toBe(true);
        expect(application1.equals(application2)).toBe(false);
        expect(application1.equals(application3)).toBe(false);
        expect(application1.equals(application4)).toBe(true);
        expect(application1.equals("A")).toBe(false);
    });

    describe("a forall is equal to another if their contents are equal assuming their bound variables are equal", () => {
        test("when the content is an identifier", () => {
            const forall1 = forall(identifier("x"), identifier("x"));
            const forall2 = forall(identifier("y"), identifier("x"));
            const forall3 = forall(identifier("y"), identifier("y"));

            expect(forall1.equals(forall1)).toBe(true);
            expect(forall1.equals(forall2)).toBe(false);
            expect(forall1.equals(forall3)).toBe(true);
        });

        test("when the content is an application with the bound variable in the argument", () => {
            const forall1 = forall(identifier("x"), application(identifier("y"), identifier("x")));
            const forall2 = forall(identifier("y"), application(identifier("y"), identifier("x")));
            const forall3 = forall(identifier("x"), application(identifier("x"), identifier("x")));
            const forall4 = forall(identifier("z"), application(identifier("y"), identifier("z")));

            expect(forall1.equals(forall1)).toBe(true);
            expect(forall1.equals(forall2)).toBe(false);
            expect(forall1.equals(forall3)).toBe(false);
            expect(forall1.equals(forall4)).toBe(true);
        });

        test("when the content is an application with the bound variable as the function", () => {
            const forall1 = forall(identifier("x"), application(identifier("x"), identifier("y")));
            const forall2 = forall(identifier("y"), application(identifier("x"), identifier("y")));
            const forall3 = forall(identifier("x"), application(identifier("x"), identifier("x")));
            const forall4 = forall(identifier("z"), application(identifier("z"), identifier("y")));

            expect(forall1.equals(forall1)).toBe(true);
            expect(forall1.equals(forall2)).toBe(false);
            expect(forall1.equals(forall3)).toBe(false);
            expect(forall1.equals(forall4)).toBe(true);
        });

        test("when the content is another forall", () => {
            const forall1 = forall(identifier("x"), forall(identifier("y"), application(identifier("x"), identifier("y"))));
            const forall2 = forall(identifier("x"), forall(identifier("x"), application(identifier("x"), identifier("x"))));
            const forall3 = forall(identifier("x"), forall(identifier("y"), application(identifier("y"), identifier("y"))));
            const forall4 = forall(identifier("y"), forall(identifier("z"), application(identifier("y"), identifier("z"))));
            const forall5 = forall(identifier("x"), forall(identifier("y"), application(identifier("x"), identifier("x"))));

            expect(forall1.equals(forall1)).toBe(true);
            expect(forall1.equals(forall2)).toBe(false);
            expect(forall1.equals(forall3)).toBe(false);
            expect(forall1.equals(forall4)).toBe(true);
            expect(forall2.equals(forall5)).toBe(false);
        });
    });

    test("an exists is equal to another if their contents are equal assuming their bound variables are equal", () => {
        const exists1 = exists(identifier("x"), identifier("x"));
        const exists2 = exists(identifier("y"), identifier("x"));
        const exists3 = exists(identifier("y"), identifier("y"));
        const forall1 = forall(identifier("x"), identifier("x"));

        expect(exists1.equals(exists1)).toBe(true);
        expect(exists1.equals(exists2)).toBe(false);
        expect(exists1.equals(exists3)).toBe(true);
        expect(exists1.equals(forall1)).toBe(false);
    });
});