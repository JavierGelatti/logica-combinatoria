# Combinatory Logic Interactive Proof System
<img
  src="https://github.com/user-attachments/assets/34071d30-281b-450a-8e2b-0917d9c6727b"
  width="250"
  align="right"
  alt="Project screenshot"
/>

An interactive proof system for exploring combinatory logic, inspired by Raymond Smullyan’s book _To Mock a Mockingbird_.
Instead of fully automating proofs, this tool allows users to manually construct logical deductions while automating tedious steps like variable substitution.

The system allows step-by-step proof construction, letting users perform logical transformations interactively.
It includes partial support for first-order logic, specifically universal (∀) and existential (∃) quantifiers.
Expressions can be rewritten by dragging and dropping terms, and users can define custom variable and expression names.


## Motivation

While solving combinatory logic puzzles manually, repetitive steps like term substitution and expression rewriting become tedious.
This system helps by automating those mechanical processes while keeping users in control of the logical reasoning.

## Supported Proof Steps

- **For-all elimination**: Apply universally quantified statements.
- **For-all introduction**: Prove a statement for an arbitrary term to generalize it.
- **Exists elimination**: Introduce a witness variable to remove an existential quantifier.
- **Exists introduction**: Deduce an existential statement from a concrete example.
- **Rewriting**: Replace sub-expressions using known equalities.
- **Bound variable renaming**: Change bound variable names safely.

## Example Interactions

- **For-all elimination**
  
  Drag an expression onto a universal quantifier to apply it:
  
  ![For-all elimination example](https://github.com/user-attachments/assets/ab95289f-9258-4dce-8ab5-6525791edebc)

- **Rewriting**
  
  Use a known equation to replace an expression:
  
  ![Rewriting example](https://github.com/user-attachments/assets/e1382f47-b0d1-418f-a818-a803b3cf8e79)

- **Exists introduction**
  
  Introduce an existential quantifier:
  
  ![Exists introduction example](https://github.com/user-attachments/assets/f3c5a1ed-7ef8-4097-bc0c-14071c23d8dd)

You can try out the system [here](https://javiergelatti.github.io/logica-combinatoria).

## Future Improvements

- Support for additional logical connectives: `⇒`, `∧`, `∨`, `¬`
- Enhanced user interface (e.g. undo/redo, proof organization tools)
