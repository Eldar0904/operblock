export const OPTIONAL_MODULES_STORAGE_KEY = "operblock-enabled-modules";
export const OPTIONAL_MODULES_UPDATED_EVENT = "operblock-modules-updated";

export type OptionalModuleId = "goals" | "opero";

export type OptionalModule = {
  id: OptionalModuleId;
  name: string;
  description: string;
};

export const OPTIONAL_MODULES: OptionalModule[] = [
  {
    id: "goals",
    name: "Goals",
    description: "Set and track long-term goals alongside your daily work.",
  },
  {
    id: "opero",
    name: "Opero Assistant",
    description: "Open the AI assistant from the dashboard sidebar.",
  },
];

export function getEnabledOptionalModules(): OptionalModuleId[] {
  try {
    const stored = JSON.parse(
      localStorage.getItem(OPTIONAL_MODULES_STORAGE_KEY) ?? "[]",
    ) as string[];
    return stored.filter(
      (id): id is OptionalModuleId => id === "goals" || id === "opero",
    );
  } catch {
    return [];
  }
}

export function setOptionalModuleEnabled(
  id: OptionalModuleId,
  enabled: boolean,
) {
  const modules = new Set(getEnabledOptionalModules());
  if (enabled) modules.add(id);
  else modules.delete(id);

  localStorage.setItem(
    OPTIONAL_MODULES_STORAGE_KEY,
    JSON.stringify([...modules]),
  );
  window.dispatchEvent(new Event(OPTIONAL_MODULES_UPDATED_EVENT));
}
