import { useEffect, useRef } from 'react';
import { CHECKED_ON, CONTACT, display, fields, sources, type Contract } from './contracts';

export function NotesDialog({ contract, onClose }: { contract: Contract | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (contract && !element?.open) element?.showModal();
    else if (!contract && element?.open) element.close();
  }, [contract]);

  return <dialog ref={dialog} className="notes-dialog" aria-labelledby="notes-title" onClose={onClose} onClick={event => {
    // Native backdrop clicks target the dialog; clicks inside its bounds stay open.
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.current?.close();
  }}>
    <div className="notes-heading">
      <div><h2 id="notes-title">Offer {contract?.id}</h2><p>{contract && `${display(contract, 'system')} · ${display(contract, 'capacity')} · ${contract.term}`}</p></div>
      <div className="notes-actions">
        <a className="contact-link" href={CONTACT.url} target="_blank" rel="noopener noreferrer">Message on Signal about offer {contract?.id}</a>
        <button type="button" onClick={() => dialog.current?.close()}>Close</button>
      </div>
    </div>
    <div className="notes-content">
      {contract && <dl className="contract-facts">{fields.filter(field => !['offer', 'notes', 'contact', 'gpu', 'gpus', 'nodes', 'allocation'].includes(field.key)).map(field =>
        <div key={field.key}><dt>{field.title}</dt><dd>{display(contract, field.key)}</dd></div>
      )}</dl>}
      <p className="note-text">{contract && display(contract, 'notes')}</p>
      {contract?.gpu === 'B300' && <div className="notes-references">
        <strong>Hardware references</strong>
        <a href={sources.hardware} target="_blank" rel="noopener noreferrer">NVIDIA DGX B300 specification</a>
        <a href={sources.scaling} target="_blank" rel="noopener noreferrer">NVIDIA scalable units</a>
        {contract.system === 'DGX B300 SuperPOD' && <a href={sources.superpod} target="_blank" rel="noopener noreferrer">NVIDIA B300 SuperPOD architecture</a>}
        {contract.network.startsWith('XDR') && <a href={sources.xdr} target="_blank" rel="noopener noreferrer">NVIDIA XDR reference</a>}
      </div>}
      <p className="notes-reviewed">Updated {CHECKED_ON}</p>
    </div>
  </dialog>;
}
