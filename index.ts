import {application, equality, exists, forall, hole, identifier, truthHole} from "./src/core/expression_constructors";
import {ExpressionView, HoleView} from "./src/dom/expression_view";
import {Expression} from "./src/core/expression";
import {createElement} from "./src/dom/createElement";
import {makeDropTargetExpecting} from "./src/dom/drag_and_drop";
import {animateWith} from "./src/dom/animation";

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
    private _newExpressionDropTarget!: HTMLElement;
    private _editorCanvasExpressions: ExpressionView[] = [];

    constructor() {
        this._domElement = this._createDomElement();
    }

    domElement(): HTMLElement {
        return this._domElement;
    }

    private _createDomElement(): HTMLElement {
        return createElement("div", {className: "expression-editor"}, [
            this._editorPallete = createElement("div", {className: "pallete"}),
            this._editorCanvas = createElement("div", {className: "canvas"}, [
                this._newExpressionDropTarget = createElement("div", {className: "new-expression-drop-target"})
            ])
        ]);
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
        if (pickedUpExpressionView.expression.isRootExpression()) {
            makeDropTargetExpecting(this._newExpressionDropTarget, pickedUpExpressionView.domElement(), () => {
                const droppedExpressionCopy = pickedUpExpressionView.expression.copy();

                const expressionView = ExpressionView.forExpression(droppedExpressionCopy);
                this._makeDraggable(expressionView);
                this._editorCanvas.insertBefore(expressionView.domElement(), this._newExpressionDropTarget);
                animateWith(expressionView.domElement(), "just-added");
                this._editorCanvasExpressions.push(expressionView);
            });
        }

        this.onEditorExpressionPickUp(pickedUpExpressionView);
    }

    private _makeDraggable(expressionView: ExpressionView<Expression>) {
        expressionView.makeDraggable({
            dropEffect: "move",
            onDragStart: () => this.onExistingExpressionPickUp(expressionView),
        });
    }

    private onExistingExpressionPickUp(pickedUpExpressionView: ExpressionView<Expression<any>>) {
        makeDropTargetExpecting(this._editorPallete, pickedUpExpressionView.domElement(), () => {
            const droppedExpression = pickedUpExpressionView.expression;

            if (!droppedExpression.isRootExpression()) {
                const newHole = droppedExpression.detachFromParent();
                pickedUpExpressionView.domElement().replaceWith(
                    ExpressionView.forExpression(newHole).domElement()
                )
            } else if (this._editorCanvasExpressions.includes(pickedUpExpressionView)) {
                this._editorCanvasExpressions.splice(this._editorCanvasExpressions.indexOf(pickedUpExpressionView), 1);
                pickedUpExpressionView.domElement().remove();
            }
        });

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
                        const newExpressionView = holeView.fillWith(pickedUpExpressionView)!;
                        this._makeDraggable(newExpressionView);
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
