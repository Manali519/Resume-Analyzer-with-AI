import { useEffect, useState } from "react";
import { api } from "../services/api.js";

// Loads the signed-in user's saved scans, newest first
export function useAnalyses() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listAnalyses()
      .then((d) => setAnalyses(d.analyses))
      .catch(() => setAnalyses([]))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (id) => {
    await api.deleteAnalysis(id);
    setAnalyses((list) => list.filter((a) => a.id !== id));
  };

  return { analyses, loading, remove };
}
