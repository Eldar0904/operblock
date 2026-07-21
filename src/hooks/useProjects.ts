import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { MOCK_PROJECT, type ApiProject } from "@/lib/mock-data";

export function useProjects() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["projects"],
    queryFn: async (): Promise<ApiProject[]> => {
      try {
        const token = await getToken();
        return await api.getProjects(token);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 503 || err.status >= 500)) {
          return [MOCK_PROJECT];
        }
        if (err instanceof TypeError) {
          return [MOCK_PROJECT];
        }
        throw err;
      }
    },
    retry: false,
  });
}

export function useCreateProject() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const token = await getToken();
      return api.createProject(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProject() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.deleteProject(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
