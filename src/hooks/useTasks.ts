import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n";
import { api, ApiError } from "@/lib/api";
import { MOCK_TASKS, type ApiTask, type Priority, type TaskStatus } from "@/lib/mock-data";
import { useToast } from "@/components/ui/toast";

function mockFallback(projectId?: string): ApiTask[] {
  const filtered = projectId
    ? MOCK_TASKS.filter((t) => t.projectId === projectId)
    : MOCK_TASKS;
  return filtered.length > 0 ? filtered : MOCK_TASKS;
}

export function useTasks(projectId?: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async (): Promise<ApiTask[]> => {
      try {
        const token = await getToken();
        return await api.getTasks(token, projectId);
      } catch (err) {
        if (err instanceof ApiError && err.status === 503) {
          return mockFallback(projectId);
        }
        if (err instanceof TypeError) {
          return mockFallback(projectId);
        }
        throw err;
      }
    },
    enabled: !!projectId,
    retry: false,
  });
}

export function useAllTasks() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["tasks", "all"],
    queryFn: async (): Promise<ApiTask[]> => {
      try {
        const token = await getToken();
        return await api.getTasks(token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 503) {
          return MOCK_TASKS;
        }
        if (err instanceof TypeError) {
          return MOCK_TASKS;
        }
        throw err;
      }
    },
    retry: false,
  });
}

function useTaskMutationHandlers() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return {
    onError: (err: Error) => {
      const message =
        err instanceof ApiError ? err.message || i18n.t("tasks.requestFailed") : i18n.t("tasks.somethingWrong");
      showToast(message, "error");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  };
}

export function useCreateTask() {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const handlers = useTaskMutationHandlers();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: Priority;
      dueDate?: string;
      assigneeUserId?: string;
    }) => {
      const token = await getToken();
      return api.createTask(token, data);
    },
    onSuccess: () => {
      showToast(i18n.t("tasks.created"), "success");
    },
    onError: handlers.onError,
    onSettled: handlers.onSettled,
  });
}

export function useUpdateTask() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const handlers = useTaskMutationHandlers();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: Priority | null;
      dueDate?: string | null;
      assigneeUserId?: string | null;
    }) => {
      const token = await getToken();
      return api.updateTask(token, id, data);
    },
    onMutate: async ({ id, status, ...rest }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previous = queryClient.getQueriesData<ApiTask[]>({ queryKey: ["tasks"] });

      queryClient.setQueriesData<ApiTask[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((task) =>
          task.id === id ? { ...task, ...(status !== undefined ? { status } : {}), ...rest } : task,
        ),
      );

      return { previous };
    },
    onError: (err, _vars, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      handlers.onError(err);
    },
    onSettled: handlers.onSettled,
  });
}

export function useUpdateTaskStatus() {
  const updateTask = useUpdateTask();
  type StatusVars = { id: string; status: TaskStatus };
  return {
    ...updateTask,
    mutate: (vars: StatusVars, options?: Parameters<typeof updateTask.mutate>[1]) =>
      updateTask.mutate(vars, options),
    mutateAsync: (vars: StatusVars) => updateTask.mutateAsync(vars),
  };
}

export function useDeleteTask() {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const handlers = useTaskMutationHandlers();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.deleteTask(token, id);
    },
    onSuccess: () => {
      showToast(i18n.t("tasks.deleted"), "success");
    },
    onError: handlers.onError,
    onSettled: handlers.onSettled,
  });
}
