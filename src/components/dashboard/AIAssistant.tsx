import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Bot, Check, ChevronLeft, History, LoaderCircle, Plus, Send, Sparkles, Trash2, X, Zap } from "lucide-react";
import { api, ApiError, type AiChatMessage, type AiConversation } from "@/lib/api";
import { cn } from "@/lib/utils";

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    try { return (JSON.parse(error.message) as { error?: string }).error ?? fallback; } catch { return fallback; }
  }
  return fallback;
}

const AUTO_APPLY_STORAGE_KEY = "opero-auto-apply-safe-actions";
const isDestructiveAction = (type: string) => type === "delete_task" || type === "delete_project";

export default function AIAssistant() {
  const { getToken } = useAuth();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const starters = [t("opero.starterOverdue"), t("opero.starterRisks"), t("opero.starterPriorities")];
  const unavailable = t("opero.unavailable");
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);
  const [autoApplySafe, setAutoApplySafe] = useState(() => localStorage.getItem(AUTO_APPLY_STORAGE_KEY) !== "false");
  const endRef = useRef<HTMLDivElement>(null);

  const token = () => getToken();

  const loadConversations = async () => {
    const rows = await api.getAiConversations(await token());
    setConversations(rows);
    return rows;
  };

  const selectConversation = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      setActiveId(id);
      setMessages(await api.getAiMessages(await token(), id));
      setShowHistory(false);
    } catch (requestError) { setError(errorMessage(requestError, unavailable)); }
    finally { setLoading(false); }
  };

  const newConversation = async () => {
    setLoading(true);
    try {
      const created = await api.createAiConversation(await token());
      setConversations((current) => [created, ...current]);
      setActiveId(created.id);
      setMessages([]);
      setShowHistory(false);
    } catch (requestError) { setError(errorMessage(requestError, unavailable)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!open || activeId) return;
    void (async () => {
      setLoading(true);
      try {
        const rows = await loadConversations();
        if (rows[0]) await selectConversation(rows[0].id);
        else await newConversation();
      } catch (requestError) { setError(errorMessage(requestError, unavailable)); setLoading(false); }
    })();
  }, [open, activeId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading || !activeId) return;
    const optimistic: AiChatMessage = { id: `pending-${Date.now()}`, conversationId: activeId, role: "user", content, actions: [], createdAt: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]);
    setInput(""); setError(null); setLoading(true);
    try {
      const response = await api.sendAiMessage(await token(), activeId, content, i18n.resolvedLanguage ?? i18n.language);
      setMessages((current) => [...current.filter((message) => message.id !== optimistic.id), response.userMessage, response.assistantMessage]);
      if (autoApplySafe) {
        for (const [index, action] of response.assistantMessage.actions.entries()) {
          if (!isDestructiveAction(action.type)) {
            await executeAction(response.assistantMessage.id, index);
          }
        }
      }
      void loadConversations();
    } catch (requestError) {
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
      setError(errorMessage(requestError, unavailable));
    } finally { setLoading(false); }
  };

  const executeAction = async (messageId: string, actionIndex: number) => {
    const key = `${messageId}-${actionIndex}`;
    setExecuting(key); setError(null);
    try {
      await api.executeAiAction(await token(), messageId, actionIndex);
      setMessages((current) => current.map((message) => message.id !== messageId ? message : ({ ...message, actions: message.actions.map((action, index) => index === actionIndex ? { ...action, status: "completed" } : action) })));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["daily-project"] }),
      ]);
    } catch (requestError) { setError(errorMessage(requestError, unavailable)); }
    finally { setExecuting(null); }
  };

  const applyAction = async (messageId: string, actionIndex: number, label: string) => {
    if (!window.confirm(t("opero.confirmAction", { action: label }))) return;
    await executeAction(messageId, actionIndex);
  };

  const toggleAutoApply = () => {
    setAutoApplySafe((current) => {
      const next = !current;
      localStorage.setItem(AUTO_APPLY_STORAGE_KEY, String(next));
      return next;
    });
  };

  const deleteConversation = async (id: string) => {
    if (!window.confirm(t("opero.deleteConversation"))) return;
    try {
      await api.deleteAiConversation(await token(), id);
      const remaining = conversations.filter((conversation) => conversation.id !== id);
      setConversations(remaining);
      if (activeId === id) {
        setActiveId(null); setMessages([]);
        if (remaining[0]) await selectConversation(remaining[0].id); else await newConversation();
      }
    } catch (requestError) { setError(errorMessage(requestError, unavailable)); }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void send(input); };

  return <div className="fixed bottom-5 right-5 z-50">
    {open && <section className="mb-3 flex h-[min(680px,calc(100vh-100px))] w-[min(420px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
      <header className="flex items-center gap-2 border-b border-border bg-indigo-600 px-3 py-3 text-white">
        {showHistory && <button onClick={() => setShowHistory(false)} className="rounded-lg p-1.5 hover:bg-white/15" aria-label={t("opero.back")}><ChevronLeft className="h-4 w-4" /></button>}
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><Sparkles className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">Opero</h2><p className="truncate text-xs text-indigo-100">{showHistory ? t("opero.history") : t("opero.agent")}</p></div>
        {!showHistory && <button onClick={toggleAutoApply} className={cn("rounded-lg p-1.5 hover:bg-white/15", autoApplySafe && "bg-white/20")} title={autoApplySafe ? t("opero.autoApplyOn") : t("opero.autoApplyOff")} aria-label={autoApplySafe ? t("opero.autoApplyOn") : t("opero.autoApplyOff")}><Zap className="h-4 w-4" /></button>}
        {!showHistory && <button onClick={() => setShowHistory(true)} className="rounded-lg p-1.5 hover:bg-white/15" aria-label={t("opero.history")}><History className="h-4 w-4" /></button>}
        <button onClick={() => void newConversation()} className="rounded-lg p-1.5 hover:bg-white/15" aria-label={t("opero.newConversation")}><Plus className="h-4 w-4" /></button>
        <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/15" aria-label={t("opero.close")}><X className="h-4 w-4" /></button>
      </header>

      {showHistory ? <div className="flex-1 overflow-y-auto p-3">
        {conversations.map((conversation) => <div key={conversation.id} className={cn("group mb-1 flex items-center rounded-lg", activeId === conversation.id && "bg-indigo-50")}>
          <button onClick={() => void selectConversation(conversation.id)} className="min-w-0 flex-1 px-3 py-2 text-left"><p className="truncate text-sm font-medium">{conversation.title}</p><p className="text-[10px] text-muted-foreground">{new Date(conversation.updatedAt).toLocaleString()}</p></button>
          <button onClick={() => void deleteConversation(conversation.id)} className="mr-2 rounded p-1 text-muted-foreground opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100" aria-label={t("opero.delete")}><Trash2 className="h-3.5 w-3.5" /></button>
        </div>)}
      </div> : <>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {!loading && messages.length === 0 && <div className="space-y-4 pt-5 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Bot className="h-6 w-6" /></div><div><p className="text-sm font-medium">{t("opero.askTitle")}</p><p className="mt-1 text-xs text-muted-foreground">{t("opero.askDescription")}</p></div><div className="space-y-2">{starters.map((starter) => <button key={starter} onClick={() => void send(starter)} className="w-full rounded-lg border border-border px-3 py-2 text-left text-xs hover:bg-muted">{starter}</button>)}</div></div>}
          {messages.map((message) => <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}><div className="max-w-[90%] space-y-2"><div className={cn("whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed", message.role === "user" ? "rounded-br-md bg-indigo-600 text-white" : "rounded-bl-md bg-muted")}>{message.content}</div>{message.actions.map((action, index) => { const key = `${message.id}-${index}`; return <div key={key} className="rounded-xl border border-indigo-200 bg-indigo-50 p-3"><p className="text-xs font-medium text-indigo-950">{action.label}</p><button disabled={action.status === "completed" || executing === key} onClick={() => void applyAction(message.id, index, action.label)} className="mt-2 flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white disabled:bg-emerald-600">{executing === key ? <LoaderCircle className="h-3 w-3 animate-spin" /> : action.status === "completed" ? <Check className="h-3 w-3" /> : null}{action.status === "completed" ? t("opero.applied") : t("opero.reviewApply")}</button></div>; })}</div></div>)}
          {loading && <div className="flex justify-start"><div className="rounded-2xl bg-muted px-3 py-2"><LoaderCircle className="h-4 w-4 animate-spin" /></div></div>}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}<div ref={endRef} />
        </div>
        <form onSubmit={submit} className="border-t border-border p-3"><div className="flex items-end gap-2 rounded-xl border border-input p-2 focus-within:ring-2 focus-within:ring-indigo-500/30"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(event); } }} rows={1} maxLength={8000} placeholder={t("opero.placeholder")} className="max-h-28 min-h-8 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm outline-none" /><button type="submit" disabled={!input.trim() || loading || !activeId} className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white disabled:opacity-40"><Send className="h-3.5 w-3.5" /></button></div><p className="mt-1.5 text-center text-[10px] text-muted-foreground">{autoApplySafe ? t("opero.autoApplyNotice") : t("opero.disclaimer")}</p></form>
      </>}
    </section>}
    <button onClick={() => setOpen((value) => !value)} className="ml-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg hover:bg-indigo-700" aria-label={open ? t("opero.close") : t("opero.open")}>{open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}</button>
  </div>;
}
