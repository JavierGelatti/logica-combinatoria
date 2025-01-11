export function animateWith(elementToAnimate: HTMLElement, animationClassName: string) {
    elementToAnimate.classList.add(animationClassName);
    elementToAnimate.addEventListener("animationend", () => {
        elementToAnimate.classList.remove(animationClassName);
    }, {once: true});
}