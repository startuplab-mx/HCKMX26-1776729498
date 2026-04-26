/**
 * FullDossierModal.jsx
 * 707 PREDATOR HUNTER - Modal de generación de dossier ejecutivo
 *
 * Funcionalidad:
 * - Botón flotante "Generar dossier completo" abre el modal
 * - Modal muestra preview HTML del dossier vía iframe
 * - 3 acciones: Imprimir/PDF (Cmd+P del iframe), Descargar PDF (WeasyPrint), Enviar email
 */

import React, { useState } from "react";
import { FileText, Download, Mail, Printer, X, Loader2, AlertTriangle } from "lucide-react";

function FullDossierModal(props) {
  const username = props.username;
  const apiBaseUrl = props.apiBaseUrl;
  const functionKey = props.functionKey;
  const isOpen = props.isOpen;
  const onClose = props.onClose;

  const [emailLoading, setEmailLoading] = useState(false);
  const [emailResult, setEmailResult] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState("");

  if (!isOpen) return null;

  // URL del HTML del dossier (con embeds para preview)
  const dossierUrl = apiBaseUrl + "/generate-full-dossier?username=" + encodeURIComponent(username) + "&embed_videos=true" + (functionKey ? "&code=" + functionKey : "");

  // Acción 1: Imprimir (usa el print del iframe)
  function handlePrint() {
    const iframe = document.getElementById("dossier-iframe");
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    } else {
      alert("Espera a que el dossier termine de cargar");
    }
  }

  // Acción 2: Descargar PDF vía WeasyPrint
  function handleDownloadPDF() {
    setPdfLoading(true);
    setPdfError(null);

    const url = apiBaseUrl + "/generate-full-dossier-pdf?username=" + encodeURIComponent(username) + (functionKey ? "&code=" + functionKey : "");

    fetch(url)
      .then(function (res) {
        if (res.status === 501) {
          // WeasyPrint no instalado, usar fallback
          return res.json().then(function (data) {
            throw new Error("PDF directo no disponible. Usa el botón 'Imprimir' y guarda como PDF desde el navegador.");
          });
        }
        if (!res.ok) {
          return res.json().then(function (data) {
            throw new Error(data.error || "Error descargando PDF");
          });
        }
        return res.blob();
      })
      .then(function (blob) {
        // Disparar descarga
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = "dossier-707-" + username + ".pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        setPdfLoading(false);
      })
      .catch(function (err) {
        setPdfError(err.message);
        setPdfLoading(false);
      });
  }

  // Acción 3: Enviar por email
  function handleSendEmail() {
    setEmailLoading(true);
    setEmailResult(null);

    const url = apiBaseUrl + "/send-full-dossier-email" + (functionKey ? "?code=" + functionKey : "");
    const body = {
      username: username
    };
    if (recipientEmail.trim()) {
      body.recipient_email = recipientEmail.trim();
    }

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        setEmailResult(data);
        setEmailLoading(false);
      })
      .catch(function (err) {
        setEmailResult({ success: false, error: err.message });
        setEmailLoading(false);
      });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)" }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">

        {/* Header del modal */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-950">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-red-400" />
            <div>
              <h2 className="text-lg font-bold text-slate-100">Dossier ejecutivo</h2>
              <div className="text-xs text-slate-500">Reporte completo de @{username}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Acciones */}
        <div className="p-4 border-b border-slate-700 bg-slate-900/50">
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition"
            >
              <Printer size={16} />
              Imprimir / Guardar como PDF
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className={"flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition " + (pdfLoading ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-500 text-white")}
            >
              {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {pdfLoading ? "Generando PDF..." : "Descargar PDF"}
            </button>

            <div className="flex-1 min-w-[300px] flex gap-2">
              <input
                type="email"
                value={recipientEmail}
                onChange={function (e) { setRecipientEmail(e.target.value); }}
                placeholder="Email destinatario (default: 707childsafetyplatform@gmail.com)"
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-600 text-sm focus:border-red-500 focus:outline-none"
              />
              <button
                onClick={handleSendEmail}
                disabled={emailLoading}
                className={"flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition " + (emailLoading ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-fuchsia-600 hover:bg-fuchsia-500 text-white")}
              >
                {emailLoading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                Enviar
              </button>
            </div>
          </div>

          {/* Feedback PDF */}
          {pdfError ? (
            <div className="mt-3 p-3 bg-yellow-950/30 border border-yellow-900 rounded-lg text-xs text-yellow-300 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{pdfError}</span>
            </div>
          ) : null}

          {/* Feedback email */}
          {emailResult ? (
            <div className={"mt-3 p-3 rounded-lg text-sm " + (emailResult.success ? "bg-emerald-950/30 border border-emerald-900 text-emerald-300" : "bg-red-950/30 border border-red-900 text-red-300")}>
              {emailResult.success ? (
                <div>
                  ✓ Email enviado a <strong>{emailResult.recipient}</strong> · Folio: <strong>{emailResult.folio}</strong>
                </div>
              ) : (
                <div>Error: {emailResult.error || "No se pudo enviar"}</div>
              )}
            </div>
          ) : null}
        </div>

        {/* Iframe con el HTML del dossier */}
        <div className="flex-1 overflow-hidden bg-slate-100">
          <iframe
            id="dossier-iframe"
            src={dossierUrl}
            title="Dossier 707"
            className="w-full h-full border-0"
            style={{ minHeight: 500 }}
          />
        </div>
      </div>
    </div>
  );
}

export default FullDossierModal;
