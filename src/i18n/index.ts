import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ru from "./locales/ru.json";
import kk from "./locales/kk.json";

export const SUPPORTED_LANGUAGES = [
  { code: "ru", label: "Русский" },
  { code: "kk", label: "Қазақша" },
  { code: "en", label: "English" },
] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const STORAGE_KEY = "operblock-lang";

function getInitialLanguage(): AppLanguage {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "ru" || stored === "kk" || stored === "en") return stored;
  return "ru";
}

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    kk: { translation: kk },
    en: {
      translation: {
        nav: {
          dashboard: "My Work",
          daily: "Team",
          myTasks: "Assigned to me",
        },
        overview: {
          dashboard: "My Work",
          myWorkTitle: "My Work",
          myWorkSubtitle: "Your tasks on the team board",
          myWorkEyebrow: "Your personal workflow",
          myWorkBoard: "Task board",
          myWorkOpen: "{{count}} open",
          myWorkDone: "{{count}} done",
          defaultName: "there",
          greeting: {
            morning: "Good morning, {{name}}",
            afternoon: "Good afternoon, {{name}}",
            evening: "Good evening, {{name}}",
          },
        },
        opero: {
          agent: "Your OperBlock agent",
          history: "Conversation history",
          back: "Back",
          close: "Close Opero",
          open: "Open Opero",
          newConversation: "New conversation",
          deleteConversation: "Delete this Opero conversation?",
          delete: "Delete conversation",
          askTitle: "Ask Opero about your workspace",
          askDescription: "Opero can read your authorized projects and propose changes for your approval.",
          starterOverdue: "What work is overdue?",
          starterRisks: "Which projects are at risk?",
          starterPriorities: "Help me prioritize today's tasks",
          placeholder: "Ask Opero or request a change...",
          disclaimer: "Opero asks before changing workspace data.",
          unavailable: "Opero is unavailable.",
          confirmAction: "Allow Opero to {{action}}?",
          reviewApply: "Review and apply",
          applied: "Applied",
          sidebarDescription: "Assistant",
          ready: "Ready",
          workingWith: "Current project:",
          starterProjectSummary: "Summarize the state of {{project}}",
          starterProjectAttention: "What needs attention in {{project}}?"
        }
      }
    },
  },
  lng: getInitialLanguage(),
  fallbackLng: "ru",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
  document.documentElement.lang = lng;
});

document.documentElement.lang = i18n.language;

export default i18n;
