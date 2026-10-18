import { useState } from "react";

export default function Uploader({ label, icon, value, onChange, onFileName }) {
  const [name, setName] = useState("");
  const [drag, setDrag] = useState(false);
  const [note, setNote] = useState("");

  const load = async (file) => {
    if (!file) return;
    setName(file.name);
    onFileName?.(file.name);
    setNote("");
    try {
      if (/\.pdf$/i.test(file.name)) {
        setNote("Reading PDF…");
        const { extractPdfText } = await import("../lib/pdfText.js"); // loaded only when needed
        onChange(await extractPdfText(file));
        setNote("");
      } else if (/\.(txt|md|rtf|text)$/i.test(file.name) || file.type.startsWith("text/")) {
        onChange(await file.text());
      } else {
        setNote("DOC/DOCX isn't supported yet — please upload a PDF or text file, or paste the text below.");
      }
    } catch {
      setNote("Couldn't read that file — please paste the text below.");
    }
  };

  return (
    <div className={`uploader card ${drag ? "drag" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); load(e.dataTransfer.files[0]); }}>
      <div className="icon">{icon}</div>
      <b>{label}</b>
      <label className="btn btn-ghost">
        Choose file
        <input type="file" accept=".txt,.md,.pdf" hidden onChange={(e) => load(e.target.files[0])} />
      </label>
      <small>{name || "or drag & drop here"}</small>
      {note && <small className="warn">{note}</small>}
      <textarea placeholder={`…or paste ${label.toLowerCase()} text`} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
