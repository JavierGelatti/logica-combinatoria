import {application, equality, exists, forall, hole, identifier, truthHole} from "./src/core/expression_constructors";
import {ExpressionView, HoleView} from "./src/dom/expression_view";
import {Expression, valueType} from "./src/core/expression";
import {createElement} from "./src/dom/createElement";
import {makeDropTarget, makeDropTargetExpecting} from "./src/dom/drag_and_drop";

const mockingbird = forall(
    identifier("x"),
    equality(
        application(identifier("M"), identifier("x")),
        application(identifier("x"), identifier("x")),
    )
);

show(mockingbird);

// show(exists(
//     identifier("x"),
//     equality(
//         application(identifier("x"), identifier("x")),
//         application(
//             application(identifier("x"), identifier("x")),
//             identifier("x")
//         ),
//     )
// ));
//
const aForAll = forall(
    identifier("x"),
    forall(identifier("y"),
        equality(hole(), identifier("x"))
    )
);
// const argument = application(identifier("y"), identifier("y", 0));
// const result = aForAll.applyTo(argument);
//
show(aForAll);
show(aForAll.applyTo(application(identifier("y"), identifier("y", 0))));
// show(result);

function show(expression: Expression) {
    document.body.append(ExpressionView.forExpression(expression).domElement());
}

class ExpressionEditor {
    private readonly _domElement: HTMLElement;
    private _editorPallete!: HTMLElement;
    private _editorCanvas!: HTMLElement;
    private _editorCanvasExpressions: ExpressionView[] = [];

    constructor() {
        this._domElement = this._createDomElement();
    }

    domElement(): HTMLElement {
        return this._domElement;
    }

    private _createDomElement(): HTMLElement {
        const editor = createElement("div", { className: "expression-editor" }, [
            this._editorPallete = createElement("div", { className: "pallete" }),
            this._editorCanvas = createElement("div", { className: "canvas" })
        ]);

        makeDropTarget(this._editorCanvas, droppedElement => {
            const droppedExpression = ExpressionView.forDomElement(droppedElement)!.expression;
            if (!droppedExpression.isRootExpression()) return;

            const droppedExpressionCopy = droppedExpression.copy();

            const expressionView = ExpressionView.forExpression(droppedExpressionCopy);
            expressionView.makeDraggable({
                dropEffect: "move",
                onDragStart: () => this.onEditorExpressionPickUp(expressionView)
            });
            this._editorCanvas.append(expressionView.domElement());
            this._editorCanvasExpressions.push(expressionView);
        });

        makeDropTarget(this._editorPallete, droppedElement => {
            const droppedExpressionView = ExpressionView.forDomElement(droppedElement)!;
            const droppedExpression = droppedExpressionView.expression;

            if (!droppedExpression.isRootExpression()) {
                const newHole = droppedExpression.detachFromParent();
                droppedExpressionView.domElement().replaceWith(
                    ExpressionView.forExpression(newHole).domElement()
                )
            }
        });

        return editor;
    }

    addToPallete(expression: Expression) {
        const expressionView = ExpressionView.forExpression(expression);
        expressionView.makeDraggable({
            onDragStart: () => this.onPalleteExpressionPickUp(expressionView),
            onDragEnd: () => {}
        });
        this._editorPallete.append(expressionView.domElement());
    }

    private onPalleteExpressionPickUp(pickedUpExpressionView: ExpressionView) {
        this.onEditorExpressionPickUp(pickedUpExpressionView);
    }

    private onEditorExpressionPickUp(pickedUpExpressionView: ExpressionView<Expression<any>>) {
        const pickedUpExpressionType = pickedUpExpressionView.expression.type();
        this._editorCanvasExpressions.forEach(expressionView => {
            const holes = expressionView.expression.allHolesOfType(pickedUpExpressionType);

            const holeViews: HoleView<any>[] = holes.map(hole => ExpressionView.forExpression(hole));

            holeViews.forEach(holeView => {
                makeDropTargetExpecting(
                    holeView.domElement(),
                    pickedUpExpressionView.domElement(),
                    () => {
                        holeView.fillWith(pickedUpExpressionView);
                    },
                );
            });
        });
    }
}


const editor = new ExpressionEditor();
[
    identifier("x"),
    identifier("y"),
    identifier("y", 0),
    identifier("y", 1),
    identifier("M"),
    application(hole(), hole()),
    equality(hole(), hole()),
    forall(identifier("x"), truthHole()),
    exists(identifier("x"), truthHole())
].forEach(e => editor.addToPallete(e));

document.body.append(editor.domElement());
