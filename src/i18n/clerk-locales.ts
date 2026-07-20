import { ruRU } from "@clerk/localizations";
import type { AppLanguage } from "./index";

/** Clerk has no official kk locale — provide Kazakh for auth UI. */
const kkClerk = {
  ...ruRU,
  locale: "kk-KZ",
  signIn: {
    ...ruRU.signIn,
    start: {
      title: "OperBlock-ке кіру",
      subtitle: "Жалғастыру үшін аккаунтыңызға кіріңіз",
      actionText: "Аккаунтыңыз жоқ па?",
      actionLink: "Тіркелу",
    },
    password: {
      title: "Құпия сөзді енгізіңіз",
      subtitle: "Жалғастыру үшін аккаунтыңызға байланған құпия сөзді енгізіңіз",
      actionLink: "Басқа әдісті пайдалану",
    },
  },
  signUp: {
    ...ruRU.signUp,
    start: {
      title: "Аккаунт жасау",
      subtitle: "Жалғастыру үшін аккаунтыңызға кіріңіз",
      actionText: "Аккаунтыңыз бар ма?",
      actionLink: "Кіру",
    },
  },
  userButton: {
    ...ruRU.userButton,
    action__manageAccount: "Аккаунтты басқару",
    action__signOut: "Шығу",
  },
  formFieldLabel__emailAddress: "Электрондық пошта",
  formFieldLabel__password: "Құпия сөз",
  formFieldLabel__firstName: "Аты",
  formFieldLabel__lastName: "Тегі",
  formButtonPrimary: "Жалғастыру",
  dividerText: "немесе",
};

export function getClerkLocalization(lang: AppLanguage | string) {
  if (lang === "kk") return kkClerk;
  return ruRU;
}
