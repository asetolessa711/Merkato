import React, { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ClipLoader } from "react-spinners";

const CodexAgent = () => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResponse("");
    toast.info("Sending prompt to Codex agent...");
    try {
      const res = await fetch("/api/codex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (res.ok) {
        setResponse(data.result);
        toast.success("Codex response received!");
      } else {
        setError(data.error || "Error from Codex agent");
        toast.error(data.error || "Error from Codex agent");
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "2rem auto", padding: 24, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px #eee" }}>
      <h2>Codex Agent Review & Fix</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={8}
          style={{ width: "100%", fontSize: 16, marginBottom: 12 }}
          placeholder="Describe your request or paste code for review/fix..."
          required
        />
        <button type="submit" disabled={loading} style={{ padding: "8px 24px", fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          {loading ? <><ClipLoader size={20} color="#fff" /> Asking Codex...</> : "Send to Codex"}
        </button>
      </form>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
      {error && <div style={{ color: "red", marginTop: 16 }}>{error}</div>}
      {loading && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <ClipLoader size={40} color="#36d7b7" />
          <div>Waiting for Codex agent response...</div>
        </div>
      )}
      {response && (
        <div style={{ marginTop: 24 }}>
          <h4>Codex Response:</h4>
          <pre style={{ background: "#f6f8fa", padding: 16, borderRadius: 4 }}>{response}</pre>
        </div>
      )}
    </div>
  );
};

export default CodexAgent;
