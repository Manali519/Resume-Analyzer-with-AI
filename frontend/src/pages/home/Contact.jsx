import { useState } from "react";
import Reveal from "../../components/Reveal.jsx";
import { api } from "../../services/api.js";

const EMPTY = { name: "", email: "", message: "" };

export default function Contact() {
  const [f, setF] = useState(EMPTY);
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    try {
      await api.sendContact(f);
      setStatus("sent");
      setF(EMPTY);
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="contact" className="section">
      <Reveal as="h2">Contact Us</Reveal>
      <Reveal as="p" className="sub">Questions or feedback? Send us a message and we'll get back to you.</Reveal>
      <Reveal className="card contact-card">
        <form onSubmit={submit}>
          <input required placeholder="Your name" value={f.name} onChange={set("name")} />
          <input required type="email" placeholder="Email" value={f.email} onChange={set("email")} />
          <textarea required placeholder="How can we help?" value={f.message} onChange={set("message")} />
          {status === "error" && <p className="error">Couldn't send your message. Please try again.</p>}
          {status === "sent" && <p className="ok">Thanks! Your message has been received ✓</p>}
          <button className="btn btn-primary" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send message"}
          </button>
        </form>
      </Reveal>
    </section>
  );
}
