import { useEffect, useRef } from 'react';
export function PauseDialog({
  onResume,
  onExit,
}: {
  onResume: () => void;
  onExit: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="pause-dialog"
      aria-labelledby="pause-title"
      onCancel={(event) => {
        event.preventDefault();
        onResume();
      }}
    >
      <section className="panel">
        <h1 id="pause-title">Paused</h1>
        <p>Ready when you are.</p>
        <button className="primary" autoFocus onClick={onResume}>
          Resume
        </button>
        <button className="secondary" onClick={onExit}>
          Main Menu
        </button>
        <small>Leaving abandons this battle.</small>
      </section>
    </dialog>
  );
}
