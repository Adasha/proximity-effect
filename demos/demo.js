// Shared by the demos: wires up the page's pause button, and exposes the
// instance as window.pe for the console and for `npm run a11y`.

export function demo(effect)
{
    window.pe = effect;

    const pause = document.getElementById("pause");
    pause?.addEventListener("click", () =>
    {
        effect.paused ? effect.resume() : effect.pause();
        pause.setAttribute("aria-pressed", String(effect.paused));
    });

    return effect;
}
