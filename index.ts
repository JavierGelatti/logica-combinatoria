import {application, equality, exists, forall, hole, identifier, truthHole} from "./src/core/expressions/expression_constructors";
import {ExpressionEditor} from "./src/dom/expressionEditor";

const editor = new ExpressionEditor();
[
    identifier("x"),
    identifier("M"),
    application(hole(), hole()),
    equality(hole(), hole()),
    forall(identifier("x"), truthHole()),
    exists(identifier("x"), truthHole())
].forEach(e => editor.addToPallete(e));

const mockingbird = forall(
    identifier("x"),
    equality(
        application(identifier("M"), identifier("x")),
        application(identifier("x"), identifier("x")),
    )
);
editor.addAxiom(mockingbird);

const composition = forall(identifier("A"),
    forall(identifier("B"),
        exists(identifier("C"),
            forall(identifier("x"),
                equality(
                    application(identifier("C"), identifier("x")),
                    application(identifier("A"), application(identifier("B"), identifier("x"))),
                )
            )
        )
    )
);
editor.addAxiom(composition);


document.body.append(editor.domElement());
